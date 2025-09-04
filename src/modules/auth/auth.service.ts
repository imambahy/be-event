import { sign } from "jsonwebtoken";
import { User } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { hash } from "bcrypt";
import { LoginDTO, RegisterDTO, UpdateUserDTO } from "../../dto/auth.dto";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

export class AuthService {
  private prisma: PrismaService;
  private mailService: MailService;
  private cloudinaryService: CloudinaryService;


  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
    this.cloudinaryService = new CloudinaryService();
  }

  register = async (userData: RegisterDTO) => {
    const { name, email, password, role, referralCode } = userData

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError("Email already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userReferralCode = null;
    let referredById = null;

    if (role === "CUSTOMER") {

      userReferralCode = this.generateReferralCode(name)

      if(referralCode) {
        const referrer = await this.prisma.user.findUnique({
          where: { referralCode },
        });

        if (!referrer) {
          throw new ApiError("Invalid referral code", 400);
        }

        if (referrer.role !== "CUSTOMER") {
          throw new ApiError("Referral code must be from a customer", 400);
        }

        referredById = referrer.id
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          referralCode: userReferralCode,
          referredById,
        },
      });

      if (referredById) {
        await tx.user.update({
          where: { id: referredById },
          data: {
            points: {
              increment: 10000,
            },
            pointsExpiry: new Date(Date.now() + 90 * 24 * 60 * 1000),
          },
        });

        const coupon = await tx.coupon.create({
          data: {
            code: `WELCOME${user.id}`,
            discountValue: 5000,
            usageLimit: 1,
            startDate: new Date(), 
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        });

        await tx.userCoupon.create({
          data: {
            userId: user.id,
            couponId: coupon.id,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        });
      }

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          referralCode: user.referralCode,
          points: user.points,
        },
        message: "Registration successful. Please login to continue.",
      }
    })
  }

  login = async (loginData: LoginDTO) => {
    const { email, password } = loginData
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError ("Invalid email or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(
      password, user.password
    )

    if(!isPasswordValid) {
      throw new ApiError("Invalid password", 401);
    }

    const token = this.generateToken(user);

    const secretKey = process.env.JWT_SECRET as string
    const expiresIn = process.env.JWT_EXPIRES_IN as string
    
    return {
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        points: user.points
      },
      token: token,
    };
  };

  private generateToken (user: any)  {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET|| "secret",
      { expiresIn: "7d" }
    );
  };

  private generateReferralCode = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${random}`;
  };

  public async getUsers()  {
    const users = await this.prisma.user.findMany();
    return users
  };

  public async getUserById (id:number) {
    const user = await this.prisma.user.findFirst({
      where: { id },
    }); 

    if (!user) throw new ApiError("user not found", 404);

    return user;
  };

  sendEmail = async (email: string) => {
    await this.mailService.sendMail(
      email, 
      "Welcome to Purwadhika!", 
      "welcome", {email: email}
    );

    return { message: "Send email success" };
  };

  uploadImage = async (image: Express.Multer.File) => {
    const { secure_url } = await this.cloudinaryService.upload(image);

    return { message: "Upload success", url: secure_url}
  };

  forgotPassword = async (body: Pick<User, "email">) => {
    const user = await this.prisma.user.findFirst({
        where: { email: body.email},
    });

    if (!user) {
        throw new ApiError("Invalid email address", 400);
    }

    const payload = { id: user.id };

    const token = sign(payload, process.env.JWT_SECRET!, {expiresIn: "15m" });

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    await this.mailService.sendMail(
        body.email, // send email to 
        "Reset your password", // subject
        "reset-password", // tempate name
        { resetLink: resetLink } // context variable
        
    );

    return { message: "send email success" };
  };

  resetPassword = async (body: Pick<User, "password">, authUserId: number) => {
    const user = await this.prisma.user.findFirst({
      where: { id: authUserId },
    });

    if(!user) {
      throw new ApiError("Account not found!", 400);
    }

    const hashedPassword = await hash(body.password, 10);

    await this.prisma.user.update({
      where: { id: authUserId },
      data: { password: hashedPassword },
    });

    return { message: "Reset password success"}
  };

  updateUser = async (id: number, userData: UpdateUserDTO) => {
    const user = await this.prisma.user.findFirst({
      where: { id },
    });
  
    if (!user) throw new ApiError("User not found", 404);
  
    const updateData: any = { ...userData };
    
    // Jika ada password baru, hash password
    if (userData.password) {
      updateData.password = await bcrypt.hash(userData.password, 10);
    }
  
    // Jika ada email baru, cek apakah email sudah digunakan user lain
    if (userData.email && userData.email !== user.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { 
          email: userData.email,
          id: { not: id } // exclude current user
        },
      });
  
      if (existingUser) {
        throw new ApiError("Email already exists", 400);
      }
    }
  
    return await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  };
}


