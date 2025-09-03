import { Router } from "express";
import { TransactionController } from "./transaction.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateCreateTransaction, validateUpdateTransactionStatus } from "../../validators/transaction.validator";
import { UploadMiddleware } from "../../middlewares/upload.middleware";

export class TransactionRouter {
  private router: Router;
  private transactionController: TransactionController;
  private jwtMiddleware: JwtMiddleware;
  private uploadMiddleware: UploadMiddleware;

  constructor() {
    this.router = Router();
    this.transactionController = new TransactionController();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploadMiddleware = new UploadMiddleware();
    this.initializedRoutes();
  }

 private initializedRoutes = () => {
    // All transaction routes require authentication
    this.router.use(this.jwtMiddleware.verifyToken(process.env.JWT_SECRET || "secret"));
    
    // Customer routes
    this.router.post("/events/:eventId/transactions", validateCreateTransaction, this.transactionController.createTransaction);
    this.router.get("/transactions", this.transactionController.getTransaction);
    this.router.get("/transactions/:id", this.transactionController.getTransactionById);
    
    // Upload payment proof with multer
    this.router.post(
      "/transactions/:id/payment-proof", 
      this.uploadMiddleware.uploadPaymentProof(),
      this.uploadMiddleware.handleUploadError,
      this.transactionController.uploadPaymentProof
    );

    // Organizer routes
    this.router.patch("/transactions/:id/status", validateUpdateTransactionStatus, this.transactionController.updateTransactionStatus);
    this.router.get("/transaction-stats", this.transactionController.getTransactionStats);
  };

  getRouter = () => {
    return this.router;
  };
}