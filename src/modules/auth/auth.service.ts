import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterDto, LoginDto } from "../../dto/auth.dto";

export class AuthService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  register = async (userData: RegisterDto) => {
    const { email, password, name, role, referralCode } = userData;

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError("Email already registered", 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate referral code and handle referral logic
    let userReferralCode = null;
    let referredById = null;

    if (role === "CUSTOMER") {
      // Only customers get referral codes
      userReferralCode = this.generateReferralCode(name);

      // If customer provided referral code, validate and set referredById
      if (referralCode) {
        const referrer = await this.prisma.user.findUnique({
          where: { referralCode }
        });

        if (!referrer) {
          throw new ApiError("Invalid referral code", 400);
        }

        if (referrer.role !== "CUSTOMER") {
          throw new ApiError("Referral code must be from a customer", 400);
        }

        referredById = referrer.id;
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create user
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

        // If user registered with referral, give rewards
      if (referredById) {
        // Give 10k points to referrer
        await tx.user.update({
          where: { id: referredById },
          data: {
            points: {
              increment: 10000,
            },
            pointsExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
          },
        });

        // buat coupon untuk user baru
        const coupon = await tx.coupon.create({
          data: {
            code: `WELCOME${user.id}`,
            discountValue: 50000, // 50k discount
            usageLimit: 1,
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
          },
        });

        // assign coupon to user
        await tx.userCoupon.create({
          data: {
            userId: user.id,
            couponId: coupon.id,
            status: "ACTIVE",
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // return user data and message
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
      };
    });
  };

  login = async (loginData: LoginDto) => {
    const { email, password } = loginData;

    // cek user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError("Invalid email or password", 401);
    }

    // cek password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new ApiError("Invalid email or password", 401);
    }

    // generate jwt token untuk user
    const token = this.generateToken(user);

    // return user data and token
    return {
    user: {
        name: user.name,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        points: user.points,
      },
      token: token,
    };
  };

  private generateToken = (user: any) => {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );
  };

  private generateReferralCode = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${random}`;
  };
}