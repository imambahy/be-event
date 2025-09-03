import { Voucher } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateVoucherDto, UpdateVoucherDto } from "../../dto/voucher.dto";

export class VoucherService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createVoucher = async (organizerId: number, voucherData: CreateVoucherDto) => {
    const { eventId, code, discountValue, usageLimit, startDate, endDate } = voucherData;

    // cek ada event atau engga dan apakah event tersebut milik organizer atau engga
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });

    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    // cek voucher code udah ada atau engga
    const existingVoucher = await this.prisma.voucher.findFirst({
      where: { code, deletedAt: null },
    });

    if (existingVoucher) {
      throw new ApiError("Voucher code already exists", 400);
    }

    // cek tanggal
    if (new Date(startDate) >= new Date(endDate)) {
      throw new ApiError("End date must be after start date", 400);
    }

    return await this.prisma.voucher.create({
      data: {
        organizerId,
        eventId,
        code,
        discountValue,
        usageLimit,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  };

  getVouchers = async (organizerId: number) => {
    return await this.prisma.voucher.findMany({
      where: { organizerId, deletedAt: null },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            userVouchers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  };

  getVoucherById = async (id: number, organizerId: number) => {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id, organizerId, deletedAt: null },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
        userVouchers: {
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

    if (!voucher) {
      throw new ApiError("Voucher not found", 404);
    }

    return voucher;
  };

  updateVoucher = async (id: number, organizerId: number, voucherData: UpdateVoucherDto) => {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id, organizerId, deletedAt: null },
    });

    if (!voucher) {
      throw new ApiError("Voucher not found", 404);
    }

    // cek voucher code udah ada atau engga
    if (voucherData.code && voucherData.code !== voucher.code) {
      const existingVoucher = await this.prisma.voucher.findFirst({
        where: { code: voucherData.code, deletedAt: null },
      });

      if (existingVoucher) {
        throw new ApiError("Voucher code already exists", 400);
      }
    }

    // cek tanggal
    if (voucherData.startDate && voucherData.endDate) {
      if (new Date(voucherData.startDate) >= new Date(voucherData.endDate)) {
        throw new ApiError("End date must be after start date", 400);
      }
    }

    const updateData: any = { ...voucherData };
    if (voucherData.startDate) updateData.startDate = new Date(voucherData.startDate);
    if (voucherData.endDate) updateData.endDate = new Date(voucherData.endDate);

    return await this.prisma.voucher.update({
      where: { id },
      data: updateData,
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  };

  deleteVoucher = async (id: number, organizerId: number) => {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id, organizerId, deletedAt: null },
    });

    if (!voucher) {
      throw new ApiError("Voucher not found", 404);
    }

    await this.prisma.voucher.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: "Voucher deleted successfully" };
  };

  // cek voucher untuk transaksi
  validateVoucher = async (code: string, eventId: number, userId: number) => {
    const voucher = await this.prisma.voucher.findFirst({
      where: { code, eventId, deletedAt: null },
    });

    if (!voucher) {
      throw new ApiError("Invalid voucher code", 400);
    }

    const now = new Date();
    if (now < voucher.startDate || now > voucher.endDate) {
      throw new ApiError("Voucher is not active", 400);
    }

    // cek limit penggunaan
    const usageCount = await this.prisma.userVoucher.count({
      where: { voucherId: voucher.id, status: "USED" },
    });

    if (usageCount >= voucher.usageLimit) {
      throw new ApiError("Voucher usage limit exceeded", 400);
    }

    // cek user udah pake voucher atau belum
    const userVoucher = await this.prisma.userVoucher.findFirst({
      where: { userId, voucherId: voucher.id, status: "USED" },
    });

    if (userVoucher) {
      throw new ApiError("You have already used this voucher", 400);
    }

    return voucher;
  };

  // get voucher stats
  getVoucherStats = async (organizerId: number) => {
    const vouchers = await this.prisma.voucher.findMany({
      where: { organizerId, deletedAt: null },
      include: {
        _count: {
          select: {
            userVouchers: {
              where: { status: "USED" },
            },
          },
        },
      },
    });

    const totalVouchers = vouchers.length;
    const totalUsed = vouchers.reduce((sum, voucher) => sum + voucher._count.userVouchers, 0);
    const activeVouchers = vouchers.filter(voucher => {
      const now = new Date();
      return now >= voucher.startDate && now <= voucher.endDate;
    }).length;

    return {
      totalVouchers,
      totalUsed,
      activeVouchers,
      vouchers,
    };
  };
}