import { PrismaService } from "../prisma/prisma.service";
import { ApiError } from "../../utils/api-error";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { RegisterDto, LoginDto } from "../../dto/auth.dto";
import { MailService } from "../mail/mail.service";

export class AuthService {
  private prisma: PrismaService;
  private mailService: MailService;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
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

        // Prevent self-referral
        if (referrer.email === email) {
          throw new ApiError("You cannot use your own referral code", 400);
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
        id: user.id, // Added user id to response
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
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new ApiError("JWT_SECRET environment variable is required", 500);
    }

    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "7d" }
    );
  };

  private generateReferralCode = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${random}`;
  };

  // Get user profile
  getProfile = async (userId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        referralCode: true,
        points: true,
        pointsExpiry: true,
        createdAt: true,
        _count: {
          select: {
            organizedEvents: true,
            reviews: true,
            userTransactions: true,
            referrals: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    return user;
  };

  // Update user profile
  updateProfile = async (userId: number, updateData: { name?: string; avatar?: string }) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        referralCode: true,
        points: true,
      },
    });
  };

  // Change password
  changePassword = async (userId: number, currentPassword: string, newPassword: string) => {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new ApiError("Current password is incorrect", 400);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });

    return { message: "Password changed successfully" };
  };

  // Reset password with email notification
  resetPassword = async (email: string) => {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Generate reset token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new ApiError("JWT_SECRET environment variable is required", 500);
    }

    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: "1h" }
    );

    try {
      // Send password reset email
      await this.mailService.sendMail(
        user.email,
        "Password Reset Request - Eventify",
        "password-reset",
        {
          userName: user.name,
          resetToken: resetToken,
          email: user.email,
          resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`,
        }
      );

      console.log(`📧 Password reset email sent to ${user.email}`);

      return { 
        message: "Password reset email sent successfully. Please check your email for reset instructions."
      };
    } catch (error) {
      console.error("Failed to send password reset email:", error);
      throw new ApiError("Failed to send password reset email", 500);
    }
  };

  // Reset password with token (for frontend)
  resetPasswordWithToken = async (token: string, newPassword: string) => {
    try {
      // Verify token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new ApiError("JWT_SECRET environment variable is required", 500);
      }

      const decoded = jwt.verify(token, jwtSecret) as any;
      
      if (!decoded.userId || !decoded.email) {
        throw new ApiError("Invalid reset token", 400);
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        throw new ApiError("User not found", 404);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      return { 
        message: "Password reset successfully. You can now login with your new password." 
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError("Invalid or expired reset token", 400);
      }
      throw error;
    }
  };
}