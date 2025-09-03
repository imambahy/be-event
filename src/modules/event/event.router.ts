import { Router } from "express";
import { EventController } from "./event.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateCreateEvent, validateUpdateEvent, validateGetEvents } from "../../validators/event.validator";

export class EventRouter {
  private router: Router;
  private eventController: EventController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.eventController = new EventController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    // Public routes - Semua orang bisa akses
    this.router.get("/events", validateGetEvents, this.eventController.getEvents);
    this.router.get("/events/slug/:slug", this.eventController.getEventBySlug);
    this.router.get("/events/:id", this.eventController.getEventById);

    // Protected routes - Hanya organizer yang bisa akses
    this.router.use(this.jwtMiddleware.verifyToken(process.env.JWT_SECRET || "secret"));
    
    this.router.post("/events", validateCreateEvent, this.eventController.createEvent);
    this.router.put("/events/:id", validateUpdateEvent, this.eventController.updateEvent);
    this.router.delete("/events/:id", this.eventController.deleteEvent);
    this.router.patch("/events/:id/publish", this.eventController.publishEvent);
    this.router.get("/my-events", this.eventController.getMyEvents);
  };

  getRouter = () => {
    return this.router;
  };
}