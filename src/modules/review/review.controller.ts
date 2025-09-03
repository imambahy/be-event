import { Request, Response } from "express";
import { ReviewService } from "./review.service";

export class ReviewController {
  private reviewService: ReviewService;

  constructor() {
    this.reviewService = new ReviewService();
  }

  createReview = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const eventId = Number(req.params.eventId);
    const result = await this.reviewService.createReview(userId, eventId, req.body);
    res.status(201).send(result);
  };

  getEventReviews = async (req: Request, res: Response) => {
    const eventId = Number(req.params.eventId);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.reviewService.getEventReviews(eventId, page, limit);
    res.status(200).send(result);
  };

  getReviewById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.reviewService.getReviewById(id);
    res.status(200).send(result);
  };

  updateReview = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = (req as any).user?.id;
    const result = await this.reviewService.updateReview(id, userId, req.body);
    res.status(200).send(result);
  };

  deleteReview = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = (req as any).user?.id;
    const result = await this.reviewService.deleteReview(id, userId);
    res.status(200).send(result);
  };

  getUserReviews = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.reviewService.getUserReviews(userId, page, limit);
    res.status(200).send(result);
  };

  getOrganizerReviews = async (req: Request, res: Response) => {
    const organizerId = (req as any).user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.reviewService.getOrganizerReviews(organizerId, page, limit);
    res.status(200).send(result);
  };

  getReviewStats = async (req: Request, res: Response) => {
    const eventId = req.query.eventId ? Number(req.query.eventId) : undefined;
    const organizerId = req.query.organizerId ? Number(req.query.organizerId) : undefined;
    const result = await this.reviewService.getReviewStats(eventId, organizerId);
    res.status(200).send(result);
  };
}