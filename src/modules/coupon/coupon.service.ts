import { Coupon } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCouponDto, UpdateCouponDto } from "../../dto/coupon.dto";

export class CouponService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  // ADMIN/ORGANIZER ONLY - Create system-wide coupons
  createCoupon = async (couponData: CreateCouponDto) => {
    const { code, discountValue, usageLimit, startDate, endDate } = couponData;

    // cek coupon code udah ada atau engga
    const existingCoupon = await this.prisma.coupon.findFirst({
      where: { code, deletedAt: null },
    });

    if (existingCoupon) {
      throw new ApiError("Coupon code already exists", 400);
    }

    // cek tanggal
    if (new Date(startDate) >= new Date(endDate)) {
      throw new ApiError("End date must be after start date", 400);
    }

    return await this.prisma.coupon.create({
      data: {
        code,
        discountValue,
        usageLimit,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
  };

  // PUBLIC - Get all active coupons for display
  getCoupons = async () => {
    return await this.prisma.coupon.findMany({
      where: { 
        deletedAt: null,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        _count: {
          select: {
            userCoupons: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  };

  // ADMIN/ORGANIZER ONLY - Get coupon details
  getCouponById = async (id: number) => {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, deletedAt: null },
      include: {
        userCoupons: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      throw new ApiError("Coupon not found", 404);
    }

    return coupon;
  };

  // ADMIN/ORGANIZER ONLY - Update system coupons
  updateCoupon = async (id: number, couponData: UpdateCouponDto) => {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, deletedAt: null },
    });

    if (!coupon) {
      throw new ApiError("Coupon not found", 404);
    }

    // cek coupon code udah ada atau b
    if (couponData.code && couponData.code !== coupon.code) {
      const existingCoupon = await this.prisma.coupon.findFirst({
        where: { code: couponData.code, deletedAt: null },
      });

      if (existingCoupon) {
        throw new ApiError("Coupon code already exists", 400);
      }
    }

    // cek tanggal
    if (couponData.startDate && couponData.endDate) {
      if (new Date(couponData.startDate) >= new Date(couponData.endDate)) {
        throw new ApiError("End date must be after start date", 400);
      }
    }

    const updateData: any = { ...couponData };
    if (couponData.startDate) updateData.startDate = new Date(couponData.startDate);
    if (couponData.endDate) updateData.endDate = new Date(couponData.endDate);

    return await this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });
  };

  // ADMIN/ORGANIZER ONLY - Delete system coupons
  deleteCoupon = async (id: number) => {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, deletedAt: null },
    });

    if (!coupon) {
      throw new ApiError("Coupon not found", 404);
    }

    await this.prisma.coupon.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: "Coupon deleted successfully" };
  };

  // INTERNAL - Validate coupon for transaction
  validateCoupon = async (code: string, userId: number) => {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code, deletedAt: null },
    });

    if (!coupon) {
      throw new ApiError("Invalid coupon code", 400);
    }

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new ApiError("Coupon is not active", 400);
    }

    // cek limit penggunaan
    const usageCount = await this.prisma.userCoupon.count({
      where: { couponId: coupon.id, status: "USED" },
    });

    if (usageCount >= coupon.usageLimit) {
      throw new ApiError("Coupon usage limit exceeded", 400);
    }

    // cek user udah pake coupon atau engga
    const userCoupon = await this.prisma.userCoupon.findFirst({
      where: { userId, couponId: coupon.id, status: "USED" },
    });

    if (userCoupon) {
      throw new ApiError("You have already used this coupon", 400);
    }

    return coupon;
  };

  // ADMIN/ORGANIZER ONLY - Get coupon statistics
  getCouponStats = async () => {
    const coupons = await this.prisma.coupon.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            userCoupons: {
              where: { status: "USED" },
            },
          },
        },
      },
    });

    const totalCoupons = coupons.length;
    const totalUsed = coupons.reduce((sum, coupon) => sum + coupon._count.userCoupons, 0);
    const activeCoupons = coupons.filter(coupon => {
      const now = new Date();
      return now >= coupon.startDate && now <= coupon.endDate;
    }).length;

    return {
      totalCoupons,
      totalUsed,
      activeCoupons,
      coupons,
    };
  };

  // CUSTOMER ONLY - Get user's available coupons
  getUserCoupons = async (userId: number) => {
    return await this.prisma.userCoupon.findMany({
      where: { 
        userId, 
        status: "ACTIVE",
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        coupon: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  };
}