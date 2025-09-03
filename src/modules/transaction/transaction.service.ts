import { Transaction } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateTransactionDto,
} from "../../dto/transaction.dto";

export class TransactionService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createTransaction = async (
    userId: number,
    eventId: number,
    transactionData: CreateTransactionDto
  ) => {
    const { ticketTypeId, quantity, pointsUsed, couponCode, voucherCode } =
      transactionData;

    // Check if ticket type exists and belongs to the event
    const ticketType = await this.prisma.ticketType.findFirst({
      where: { id: ticketTypeId, deletedAt: null },
      include: { event: true },
    });

    if (!ticketType) {
      throw new ApiError("Ticket type not found", 404);
    }

    if (ticketType.event.id !== eventId) {
      throw new ApiError("Ticket type does not belong to this event", 400);
    }

    // Check if event is published
    if (!ticketType.event.published) {
      throw new ApiError("Event is not published", 400);
    }

    // Check available seats
    if (ticketType.availableSeats < quantity) {
      throw new ApiError("Not enough available seats", 400);
    }

    // Check user points if using points
    if (pointsUsed && pointsUsed > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.points < pointsUsed) {
        throw new ApiError("Insufficient points", 400);
      }
    }

    let couponId = null;
    let voucherId = null;
    let discountAmount = 0;

    // Validate and apply coupon
    if (couponCode) {
      const coupon = await this.validateCoupon(couponCode, userId);
      couponId = coupon.id;
      discountAmount += coupon.discountValue;
    }

    // Validate and apply voucher
    if (voucherCode) {
      const voucher = await this.validateVoucher(voucherCode, eventId, userId);
      voucherId = voucher.id;
      discountAmount += voucher.discountValue;
    }

    const totalAmount = ticketType.price * quantity;
    const finalAmount = Math.max(
      0,
      totalAmount - discountAmount - (pointsUsed || 0)
    );

    return await this.prisma.$transaction(async (tx) => {
      // Update available seats
      await tx.ticketType.update({
        where: { id: ticketType.id },
        data: {
          availableSeats: ticketType.availableSeats - quantity,
        },
      });

      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

      // Create transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          organizerId: ticketType.event.organizerId,
          eventId,
          status: "WAITING_FOR_PAYMENT",
          ticketTypeId: ticketType.id,
          quantity,
          unitPrice: ticketType.price,
          totalAmount,
          pointsUsed: pointsUsed || 0,
          couponId,
          voucherId,
          finalAmount,
          expiresAt, // 2 hours
        },
        include: {
          ticketType: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Update user points if used
      if (pointsUsed && pointsUsed > 0) {
        await tx.user.update({
          where: { id: userId },
          data: {
            points: {
              decrement: pointsUsed,
            },
          },
        });
      }

      // Create user coupon/voucher records if used
      if (couponId) {
        await tx.userCoupon.create({
          data: {
            userId,
            couponId,
            status: "USED",
            usedAt: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
          },
        });
      }

      if (voucherId) {
        await tx.userVoucher.create({
          data: {
            userId,
            voucherId,
            status: "USED",
            usedAt: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
          },
        });
      }

      return transaction;
    });
  };

  getTransaction = async (userId: number, role: string) => {
    const where: any = { deletedAt: null };

    if (role === "CUSTOMER") {
      where.userId = userId;
    } else if (role === "ORGANIZER") {
      where.organizerId = userId;
    }

    return await this.prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketType: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                location: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            location: true,
            startDate: true,
            endDate: true,

          },
        },
        coupon: {
          select: {
            id: true,
            code: true,
            discountValue: true,
          },
        },
        voucher: {
          select: {
            id: true,
            code: true,
            discountValue: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  };

  getTransactionById = async (id: number, userId: number, role: string) => {
    const where: any = { id, deletedAt: null };

    if (role === "CUSTOMER") {
      where.userId = userId;
    } else if (role === "ORGANIZER") {
      where.organizerId = userId;
    }

    const transaction = await this.prisma.transaction.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketType: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                location: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            location: true,
            startDate: true,
            endDate: true,

            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        coupon: {
          select: {
            id: true,
            code: true,
            discountValue: true,
          },
        },
        voucher: {
          select: {
            id: true,
            code: true,
            discountValue: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }

    return transaction;
  };

  updateTransactionStatus = async (
    id: number,
    status: string,
    options?: {
      organizerId?: number;
      isAutoProcess?: boolean;
    }
  ) => {
    const { organizerId, isAutoProcess = false } = options || {};
    const where: any = { id, deletedAt: null };

    // validasi organizerId jika bukan auto-process, terus berikan organizerId
    if (!isAutoProcess && organizerId) {
      where.organizerId = organizerId;
    }

    const transaction = await this.prisma.transaction.findFirst({ where });

    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }

    // validate status transition
    if (!this.isValidStatusTransition(transaction.status, status)) {
      throw new ApiError("Invalid status transition", 400);
    }

    return await this.prisma.$transaction(async (tx) => {
      const updatedTransaction = await tx.transaction.update({
        where: { id },
        data: { status: status as any },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ticketType: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      // jika transaksi ditolak atau kadaluarsa, restore seats, poin, dan coupon/voucher
      if (
        status === "REJECTED" ||
        status === "EXPIRED" ||
        status === "CANCELLED"
      ) {
        await this.restoreResources(tx, transaction);
      }

      return updatedTransaction;
    });
  };

  uploadPaymentProof = async (
    id: number,
    userId: number,
    paymentProof: string
  ) => {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!transaction) {
      throw new ApiError("Transaction not found", 404);
    }

    if (transaction.status !== "WAITING_FOR_PAYMENT") {
      throw new ApiError(
        "Transaction is not in waiting for payment status",
        400
      );
    }

    if (new Date() > transaction.expiresAt) {
      throw new ApiError("Payment proof upload time has expired", 400);
    }

    return await this.prisma.transaction.update({
      where: { id },
      data: {
        paymentProof,
        status: "WAITING_FOR_CONFIRMATION",
      },
    });
  };

  getTransactionStats = async (organizerId: number) => {
    const transactions = await this.prisma.transaction.findMany({
      where: { organizerId, deletedAt: null },
    });

    const totalTransactions = transactions.length;
    const totalRevenue = transactions
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + t.finalAmount, 0);

    const pendingTransactions = transactions.filter(
      (t) => t.status === "WAITING_FOR_CONFIRMATION"
    ).length;

    const completedTransactions = transactions.filter(
      (t) => t.status === "DONE"
    ).length;

    return {
      totalTransactions,
      totalRevenue,
      pendingTransactions,
      completedTransactions,
      transactions,
    };
  };

  // Get expired transactions (for auto-expiration)
  getExpiredTransactions = async () => {
    return await this.prisma.transaction.findMany({
      where: {
        status: "WAITING_FOR_PAYMENT",
        expiresAt: { lt: new Date() },
        deletedAt: null,
      },
    });
  };

  // Get pending transactions for auto-cancellation (3 days old)
  getPendingTransactions = async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    return await this.prisma.transaction.findMany({
      where: {
        status: "WAITING_FOR_CONFIRMATION",
        updatedAt: { lt: threeDaysAgo },
        deletedAt: null,
      },
    });
  };
  
  private validateCoupon = async (code: string, userId: number) => {
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

    const usageCount = await this.prisma.userCoupon.count({
      where: { couponId: coupon.id, status: "USED" },
    });

    if (usageCount >= coupon.usageLimit) {
      throw new ApiError("Coupon usage limit exceeded", 400);
    }

    const userCoupon = await this.prisma.userCoupon.findFirst({
      where: { userId, couponId: coupon.id, status: "USED" },
    });

    if (userCoupon) {
      throw new ApiError("You have already used this coupon", 400);
    }

    return coupon;
  };

  private validateVoucher = async (
    code: string,
    eventId: number,
    userId: number
  ) => {
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

    const usageCount = await this.prisma.userVoucher.count({
      where: { voucherId: voucher.id, status: "USED" },
    });

    if (usageCount >= voucher.usageLimit) {
      throw new ApiError("Voucher usage limit exceeded", 400);
    }

    const userVoucher = await this.prisma.userVoucher.findFirst({
      where: { userId, voucherId: voucher.id, status: "USED" },
    });

    if (userVoucher) {
      throw new ApiError("You have already used this voucher", 400);
    }

    return voucher;
  };

  private isValidStatusTransition = (
    currentStatus: string,
    newStatus: string
  ): boolean => {
    const validTransitions: { [key: string]: string[] } = {
      WAITING_FOR_PAYMENT: ["WAITING_FOR_CONFIRMATION", "EXPIRED", "CANCELLED"],
      WAITING_FOR_CONFIRMATION: ["DONE", "REJECTED", "CANCELLED"],
      DONE: [],
      REJECTED: [],
      EXPIRED: [],
      CANCELLED: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  };

  private restoreResources = async (tx: any, transaction: any) => {
    console.log(`🔄 Restoring resources for transaction ${transaction.id}: ${transaction.quantity} seats, ${transaction.pointsUsed} points`);
    
    // restore seats
    await tx.ticketType.update({
      where: { id: transaction.ticketTypeId },
      data: {
        availableSeats: {
          increment: transaction.quantity,
        },
      },
    });
    
    console.log(`✅ Restored ${transaction.quantity} seats for ticketType ${transaction.ticketTypeId}`);

    // restore point
    if (transaction.pointsUsed > 0) {
      await tx.user.update({
        where: { id: transaction.userId },
        data: {
          points: {
            increment: transaction.pointsUsed,
          },
        },
      });
    }

    // restore coupon/voucher
    if (transaction.couponId) {
      await tx.userCoupon.updateMany({
        where: {
          userId: transaction.userId,
          couponId: transaction.couponId,
          status: "USED",
        },
        data: { status: "ACTIVE" },
      });
    }

    if (transaction.voucherId) {
      await tx.userVoucher.updateMany({
        where: {
          userId: transaction.userId,
          voucherId: transaction.voucherId,
          status: "USED",
        },
        data: { status: "ACTIVE" },
      });
    }
  };
}