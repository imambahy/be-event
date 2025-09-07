import { Transaction } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import {
  CreateTransactionDto,
} from "../../dto/transaction.dto";

export class TransactionService {
  private prisma: PrismaService;
  private mailService: MailService;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
  }

  createTransaction = async (
    userId: number,
    eventId: number,
    transactionData: CreateTransactionDto
  ) => {
    const { ticketTypeId, quantity, pointsUsed, couponCode, voucherCode } =
      transactionData;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

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

    // Check if event has expired
    if (new Date(ticketType.event.endDate) < new Date()) {
      throw new ApiError("Cannot purchase tickets for expired events", 400);
    }

    // Check available seats
    if (ticketType.availableSeats < quantity) {
      throw new ApiError("Not enough available seats", 400);
    }

    // Check user points if using points
    if (pointsUsed && pointsUsed > 0) {
      if (user.points < pointsUsed) {
        throw new ApiError("Insufficient points", 400);
      }
    }

    let couponId = null;
    let voucherId = null;
    let coupon = null;
    let voucher = null;
    let discountAmount = 0;

    // Validate and apply coupon
    if (couponCode) {
      coupon = await this.validateCoupon(couponCode, userId);
      couponId = coupon.id;
      discountAmount += coupon.discountValue;
    }

    // Validate and apply voucher
    if (voucherCode) {
      voucher = await this.validateVoucher(voucherCode, eventId, userId);
      voucherId = voucher.id;
      discountAmount += voucher.discountValue;
    }

    const totalAmount = ticketType.price * quantity;
    const finalAmount = Math.max(
      0,
      totalAmount - discountAmount - (pointsUsed || 0)
    );

    // Validate final amount for paid events
    const isFreeEvent = ticketType.price === 0;
    if (!isFreeEvent && finalAmount <= 0) {
      throw new ApiError("Final amount must be greater than 0 for paid events", 400);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update available seats with optimistic concurrency
      await tx.ticketType.update({
        where: {
          id: ticketType.id,
          availableSeats: { gte: quantity } // Optimistic lock
        },
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
      if (coupon && couponId) {
        await tx.userCoupon.create({
          data: {
            userId,
            couponId,
            status: "USED",
            usedAt: new Date(),
            expiresAt: new Date(coupon.endDate), // Use coupon's endDate
          },
        });
      }

      if (voucher && voucherId) {
        await tx.userVoucher.create({
          data: {
            userId,
            voucherId,
            status: "USED",
            usedAt: new Date(),
            expiresAt: new Date(voucher.endDate), // Use voucher's endDate
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

    // validasi organizerId jika bukan auto-process
    if (!isAutoProcess) {
      if (!organizerId) {
        throw new ApiError("OrganizerId is required for manual status updates", 400);
      }
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

      // Send email notification for status changes
      if (status === "DONE" || status === "REJECTED") {
        await this.sendTransactionStatusNotification(updatedTransaction, status);
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

    // Validate status transition
    if (!this.isValidStatusTransition(transaction.status, "WAITING_FOR_CONFIRMATION")) {
      throw new ApiError("Invalid status transition", 400);
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

  // Get detailed statistics for dashboard
  getDashboardStats = async (organizerId: number) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get all transactions for the organizer
    const allTransactions = await this.prisma.transaction.findMany({
      where: { organizerId, deletedAt: null },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    // Monthly statistics
    const monthlyTransactions = allTransactions.filter(
      (t) => t.createdAt >= startOfMonth
    );

    // Yearly statistics
    const yearlyTransactions = allTransactions.filter(
      (t) => t.createdAt >= startOfYear
    );

    // Revenue calculations
    const totalRevenue = allTransactions
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + t.finalAmount, 0);

    const monthlyRevenue = monthlyTransactions
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + t.finalAmount, 0);

    const yearlyRevenue = yearlyTransactions
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + t.finalAmount, 0);

    // Status breakdown
    const statusBreakdown = {
      WAITING_FOR_PAYMENT: allTransactions.filter((t) => t.status === "WAITING_FOR_PAYMENT").length,
      WAITING_FOR_CONFIRMATION: allTransactions.filter((t) => t.status === "WAITING_FOR_CONFIRMATION").length,
      DONE: allTransactions.filter((t) => t.status === "DONE").length,
      REJECTED: allTransactions.filter((t) => t.status === "REJECTED").length,
      EXPIRED: allTransactions.filter((t) => t.status === "EXPIRED").length,
      CANCELLED: allTransactions.filter((t) => t.status === "CANCELLED").length,
    };

    // Monthly revenue chart data (last 12 months)
    const monthlyRevenueData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthTransactions = allTransactions.filter(
        (t) => t.createdAt >= monthStart && t.createdAt <= monthEnd && t.status === "DONE"
      );
      
      const monthRevenue = monthTransactions.reduce((sum, t) => sum + t.finalAmount, 0);
      
      monthlyRevenueData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        transactions: monthTransactions.length,
      });
    }

    return {
      overview: {
        totalTransactions: allTransactions.length,
        totalRevenue,
        monthlyRevenue,
        yearlyRevenue,
        pendingTransactions: statusBreakdown.WAITING_FOR_CONFIRMATION,
        completedTransactions: statusBreakdown.DONE,
      },
      statusBreakdown,
      monthlyRevenueData,
      recentTransactions: allTransactions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10),
    };
  };

  // Get attendee list for an event
  getEventAttendees = async (eventId: number, organizerId: number) => {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, organizerId, deletedAt: null },
    });

    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    const attendees = await this.prisma.transaction.findMany({
      where: {
        eventId,
        organizerId,
        status: "DONE",
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
      },
      attendees: attendees.map((transaction) => ({
        id: transaction.id,
        userName: transaction.user.name,
        userEmail: transaction.user.email,
        ticketType: transaction.ticketType.name,
        quantity: transaction.quantity,
        unitPrice: transaction.unitPrice,
        totalAmount: transaction.totalAmount,
        finalAmount: transaction.finalAmount,
        purchaseDate: transaction.createdAt,
      })),
      totalAttendees: attendees.reduce((sum, t) => sum + t.quantity, 0),
      totalRevenue: attendees.reduce((sum, t) => sum + t.finalAmount, 0),
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

  // Send email notification for transaction status changes
  private sendTransactionStatusNotification = async (transaction: any, status: string) => {
    try {
      const subject = status === "DONE" 
        ? "Transaction Approved - Payment Confirmed" 
        : "Transaction Rejected - Payment Not Confirmed";

      const templateName = status === "DONE" ? "transaction-approved" : "transaction-rejected";

      const context = {
        userName: transaction.user.name,
        eventTitle: transaction.ticketType.event.title,
        transactionId: transaction.id,
        quantity: transaction.quantity,
        ticketType: transaction.ticketType.name,
        finalAmount: transaction.finalAmount,
        status: status,
        date: new Date().toLocaleDateString(),
      };

      await this.mailService.sendMail(
        transaction.user.email,
        subject,
        templateName,
        context
      );

      console.log(`📧 Email notification sent to ${transaction.user.email} for transaction ${transaction.id} - Status: ${status}`);
    } catch (error) {
      console.error("Failed to send email notification:", error);
      // Don't throw error to avoid breaking the transaction flow
    }
  };
}