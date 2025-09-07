import { Event } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto, UpdateEventDto } from "../../dto/event.dto";

export class EventService {
  private prisma: PrismaService;

  constructor() {
    this.prisma = new PrismaService();
  }

  createEvent = async (organizerId: number, eventData: CreateEventDto) => {
    const { ticketTypes, ...eventInfo } = eventData;

    // Validate date range
    if (new Date(eventInfo.startDate) >= new Date(eventInfo.endDate)) {
      throw new ApiError("Start date must be before end date", 400);
    }

    const slug = this.generateSlug(eventInfo.title);

    // Check if slug is unique
    const existingEvent = await this.prisma.event.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    if (existingEvent) {
      throw new ApiError("Event with this title already exists. Please choose a different title.", 400);
    }

    return await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          ...eventInfo,
          organizerId,
          slug,
          published: false, // Default false, harus publish manual
          startDate: new Date(eventInfo.startDate),
          endDate: new Date(eventInfo.endDate),
        },
      });

      await Promise.all(
        ticketTypes.map((ticketType) =>
          tx.ticketType.create({
            data: {
              ...ticketType,
              eventId: event.id,
              availableSeats: ticketType.totalSeats,
            },
          })
        )
      );

      return event;
    });
  };

  // Public - hanya event yang sudah dipublish
  getEvents = async (filters: any, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
      published: true, // Hanya event yang sudah dipublish
    };

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    // Add status filter (upcoming/ongoing/past)
    const now = new Date();
    if (filters.status) {
      switch (filters.status) {
        case 'upcoming':
          where.startDate = { gt: now };
          break;
        case 'ongoing':
          where.startDate = { lte: now };
          where.endDate = { gte: now };
          break;
        case 'past':
          where.endDate = { lt: now };
          break;
      }
    }

    // Simple sorting by creation date (newest first)
    const orderBy: any = { createdAt: "desc" };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ticketTypes: {
            where: { deletedAt: null },
          },
          reviews: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    const eventsWithDetails = await Promise.all(
      events.map((event) => this.calculateEventDetails(event))
    );

    return {
      data: eventsWithDetails,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    };
  };

  getEventById = async (id: number) => {
    const event = await this.prisma.event.findFirst({
      where: { id, deletedAt: null, published: true }, // Hanya event yang dipublish
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketTypes: {
          where: { deletedAt: null },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!event) throw new ApiError("Event not found", 404);

    return await this.calculateEventDetails(event);
  };

  getEventBySlug = async (slug: string) => {
    const event = await this.prisma.event.findFirst({
      where: { slug, deletedAt: null, published: true }, // Hanya event yang dipublish
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketTypes: {
          where: { deletedAt: null },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!event) throw new ApiError("Event not found", 404);

    return await this.calculateEventDetails(event);
  };

  updateEvent = async (id: number, organizerId: number, eventData: UpdateEventDto) => {
    const event = await this.prisma.event.findFirst({
      where: { id, organizerId, deletedAt: null },
    });

    if (!event) throw new ApiError("Event not found", 404);

    const updateData: any = { ...eventData };

    // Validate date range if both dates are being updated
    const newStartDate = eventData.startDate ? new Date(eventData.startDate) : event.startDate;
    const newEndDate = eventData.endDate ? new Date(eventData.endDate) : event.endDate;

    if (newStartDate >= newEndDate) {
      throw new ApiError("Start date must be before end date", 400);
    }

    if (eventData.startDate) updateData.startDate = newStartDate;
    if (eventData.endDate) updateData.endDate = newEndDate;

    return await this.prisma.event.update({
      where: { id },
      data: updateData,
    });
  };

  deleteEvent = async (id: number, organizerId: number) => {
    const event = await this.prisma.event.findFirst({
      where: { id, organizerId, deletedAt: null },
    });

    if (!event) throw new ApiError("Event not found", 404);

    // Check if there are any DONE transactions for this event
    const doneTransactions = await this.prisma.transaction.count({
      where: {
        eventId: id,
        status: "DONE",
        deletedAt: null,
      },
    });

    if (doneTransactions > 0) {
      throw new ApiError("Cannot delete event with completed transactions", 400);
    }

    await this.prisma.event.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: "Event deleted successfully" };
  };

  // Logic untuk publish event
  publishEvent = async (id: number, organizerId: number) => {
    const event = await this.prisma.event.findFirst({
      where: { id, organizerId, deletedAt: null },
      include: {
        ticketTypes: {
          where: { deletedAt: null },
        },
      },
    });

    if (!event) throw new ApiError("Event not found", 404);

    // Validasi sebelum publish
    if (!event.ticketTypes || event.ticketTypes.length === 0) {
      throw new ApiError("Event must have at least one ticket type before publishing", 400);
    }

    if (new Date(event.startDate) <= new Date()) {
      throw new ApiError("Event start date must be in the future", 400);
    }

    if (new Date(event.endDate) <= new Date()) {
      throw new ApiError("Event end date must be in the future", 400);
    }

    // Check total available seats across all ticket types
    const totalSeats = event.ticketTypes.reduce((sum, ticketType) => sum + ticketType.availableSeats, 0);
    if (totalSeats <= 0) {
      throw new ApiError("Event must have available seats before publishing", 400);
    }

    return await this.prisma.event.update({
      where: { id },
      data: { published: true },
    });
  };

  unpublishEvent = async (id: number, organizerId: number) => {
    const event = await this.prisma.event.findFirst({
      where: { id, organizerId, deletedAt: null },
    });

    if (!event) throw new ApiError("Event not found", 404);

    // Check if there are any DONE transactions for this event
    const doneTransactions = await this.prisma.transaction.count({
      where: {
        eventId: id,
        status: "DONE",
        deletedAt: null,
      },
    });

    if (doneTransactions > 0) {
      throw new ApiError("Cannot unpublish event with completed transactions", 400);
    }

    return await this.prisma.event.update({
      where: { id },
      data: { published: false },
    });
  };

  // Untuk organizer - semua event milik organizer
  getMyEvents = async (organizerId: number) => {
    const events = await this.prisma.event.findMany({
      where: { 
        organizerId, 
        deletedAt: null 
        // Tidak ada filter published, tampilkan semua
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ticketTypes: {
          where: { deletedAt: null },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // ✅ Apply calculateEventDetails to get accurate totalAttendees, averageRating, etc.
    const eventsWithDetails = await Promise.all(
      events.map((event) => this.calculateEventDetails(event))
    );

    return eventsWithDetails;
  };

  private generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  private calculateEventDetails = async (event: any) => {
    const ticketTypes = event.ticketTypes || [];
    const reviews = event.reviews || [];

    const totalReviews = reviews.length;
    const rawAverageRating =
      totalReviews > 0
        ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) /
          totalReviews
        : 0;

    // Clamp rating to 1-5 range
    const averageRating = Math.max(1, Math.min(5, Math.round(rawAverageRating * 10) / 10));

    // ✅ Calculate attendees only from DONE transactions
    const doneTransactions = await this.prisma.transaction.findMany({
      where: {
        eventId: event.id,
        status: 'DONE',
        deletedAt: null
      },
      select: { quantity: true }
    });

    const totalAttendees = doneTransactions.reduce(
      (sum: number, transaction: any) => sum + transaction.quantity,
      0
    );

    const isFree = ticketTypes.every((ticket: any) => ticket.price === 0);

    return {
      ...event,
      averageRating,
      totalReviews,
      totalAttendees,
      isFree,
      isFeatured: false,
      time: `${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()}`,
    };
  };
}