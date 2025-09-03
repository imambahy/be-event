import { Review } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto, UpdateReviewDto } from "../../dto/review.dto";

export class ReviewService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createReview = async (userId: number, eventId: number, reviewData: CreateReviewDto) => {
    const { rating, comment } = reviewData;

    // cek event ada atau tidak
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    // cek user yang udah pernah ikut event (udah transaksi)
    const hasAttended = await this.prisma.transaction.findFirst({
      where: {
        userId,
        eventId,
        status: "DONE",
      },
    });

    if (!hasAttended) {
      throw new ApiError("You can only review events you have attended", 400);
    }

    // cek event sudah berakhir atau belum
    if (new Date() < event.endDate) {
      throw new ApiError("You can only review events after they have ended", 400);
    }

    // cek user sudah pernah review event ini atau belum
    const existingReview = await this.prisma.review.findFirst({
      where: { userId, eventId },
    });

    if (existingReview) {
      throw new ApiError("You have already reviewed this event", 400);
    }

    return await this.prisma.review.create({
      data: {
        userId,
        eventId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  };

  getEventReviews = async (eventId: number, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    // cek event ada atau tidak
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });

    if (!event) {
      throw new ApiError("Event not found", 404);
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { eventId },
      }),
    ]);

    // hitung rata-rata rating
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    return {
      data: reviews,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  };

  getReviewById = async (id: number) => {
    const review = await this.prisma.review.findFirst({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!review) {
      throw new ApiError("Review not found", 404);
    }

    return review;
  };

  updateReview = async (id: number, userId: number, reviewData: UpdateReviewDto) => {
    const review = await this.prisma.review.findFirst({
      where: { id, userId },
    });

    if (!review) {
      throw new ApiError("Review not found", 404);
    }

    // cek review sudah ada atau belum
    const reviewAge = Date.now() - review.createdAt.getTime();
    const hoursSinceCreation = reviewAge / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) {
      throw new ApiError("Reviews can only be edited within 24 hours of creation", 400);
    }

    return await this.prisma.review.update({
      where: { id },
      data: reviewData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  };

  deleteReview = async (id: number, userId: number) => {
    const review = await this.prisma.review.findFirst({
      where: { id, userId },
    });

    if (!review) {
      throw new ApiError("Review not found", 404);
    }

    // cek review sudah ada atau belum
    const reviewAge = Date.now() - review.createdAt.getTime();
    const hoursSinceCreation = reviewAge / (1000 * 60 * 60);

    if (hoursSinceCreation > 24) {
      throw new ApiError("Reviews can only be deleted within 24 hours of creation", 400);
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return { message: "Review deleted successfully" };
  };

  getUserReviews = async (userId: number, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { userId },
      }),
    ]);

    return {
      data: reviews,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    };
  };

  getOrganizerReviews = async (organizerId: number, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          event: {
            organizerId,
            deletedAt: null,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: {
          event: {
            organizerId,
            deletedAt: null,
          },
        },
      }),
    ]);

    // hitung rata-rata rating untuk organizer
    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    return {
      data: reviews,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  };

  getReviewStats = async (eventId?: number, organizerId?: number) => {
    let where: any = {};

    if (eventId) {
      where.eventId = eventId;
    } else if (organizerId) {
      where.event = {
        organizerId,
        deletedAt: null,
      };
    }

    const reviews = await this.prisma.review.findMany({
      where,
      select: {
        rating: true,
      },
    });

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0;

    // count distribusi rating
    const ratingDistribution = {
      1: reviews.filter(r => r.rating === 1).length,
      2: reviews.filter(r => r.rating === 2).length,
      3: reviews.filter(r => r.rating === 3).length,
      4: reviews.filter(r => r.rating === 4).length,
      5: reviews.filter(r => r.rating === 5).length,
    };

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
    };
  };
}