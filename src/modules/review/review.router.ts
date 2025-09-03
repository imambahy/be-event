import { Router } from "express";
import { ReviewController } from "./review.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateCreateReview, validateUpdateReview } from "../../validators/review.validator";

export class ReviewRouter {
  private router: Router;
  private reviewController: ReviewController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.reviewController = new ReviewController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    // Public routes - get reviews
    this.router.get("/events/:eventId/reviews", this.reviewController.getEventReviews);
    this.router.get("/reviews/:id", this.reviewController.getReviewById);
    this.router.get("/review-stats", this.reviewController.getReviewStats);

    // Protected routes - customer only
    this.router.use(this.jwtMiddleware.verifyToken(process.env.JWT_SECRET || "secret"));
    
    this.router.post("/events/:eventId/reviews", validateCreateReview, this.reviewController.createReview);
    this.router.put("/reviews/:id", validateUpdateReview, this.reviewController.updateReview);
    this.router.delete("/reviews/:id", this.reviewController.deleteReview);
    this.router.get("/user/reviews", this.reviewController.getUserReviews);

    // Organizer routes - organizer only
    this.router.get("/organizer/reviews", this.reviewController.getOrganizerReviews);
  };

  getRouter = () => {
    return this.router;
  };
}