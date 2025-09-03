import { NextFunction, Request, Response } from "express";
import { EventService } from "./event.service";
import { ApiError } from "../../utils/api-error";

export class EventController {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  createEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can create events", 403);
      }

      const result = await this.eventService.createEvent((req as any).user.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  // public endpoint (simplified)
  getEvents = async (req: Request, res: Response) => {
    const filters = {
      search: req.query.search as string || '',
      category: req.query.category as string || '',
    };

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.eventService.getEvents(filters, page, limit);
    res.status(200).send(result);
  };

  getEventById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.eventService.getEventById(id);
    res.status(200).send(result);
  };

  getEventBySlug = async (req: Request, res: Response) => {
    const slug = req.params.slug;
    const result = await this.eventService.getEventBySlug(slug);
    res.status(200).send(result);
  };
  // end of public endpoint

  // organizer endpoint
  updateEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // cek user is organizer or not
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can update events", 403);
      }
      
      const id = Number(req.params.id);
      const result = await this.eventService.updateEvent(id, (req as any).user.id, req.body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can delete events", 403);
      }

      const id = Number(req.params.id);
      await this.eventService.deleteEvent(id, (req as any).user.id);
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      next(error);
    }
  };
  
  publishEvent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // cek user is organizer or not
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can publish events", 403);
      }

      const id = Number(req.params.id);
      const result = await this.eventService.publishEvent(id, (req as any).user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  getMyEvents = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can view their events", 403);
      }
  
      const result = await this.eventService.getMyEvents((req as any).user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}