import cors from "cors";
import express, { Express } from "express";
import { PORT } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
import { EventRouter } from "./modules/event/event.router";
import { AuthRouter } from "./modules/auth/auth.router";
import { VoucherRouter } from "./modules/voucher/voucher.router";
import { CouponRouter } from "./modules/coupon/coupon.router";
import { TransactionRouter } from "./modules/transaction/transaction.router";
import { ReviewRouter } from "./modules/review/review.router";
import { CronService } from "./services/cron.service";

export class App {
  app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
    CronService.init();
  }

  private configure() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));
    
    this.app.use(express.json());
    this.app.use("/uploads", express.static("uploads"));
  }

  private routes() {
    const authRouter = new AuthRouter();
    const eventRouter = new EventRouter();
    const voucherRouter = new VoucherRouter();
    const couponRouter = new CouponRouter();
    const transactionRouter = new TransactionRouter();
    const reviewRouter = new ReviewRouter(); 
     
    this.app.use("/auth", authRouter.getRouter());
    this.app.use("/event", eventRouter.getRouter());
    this.app.use("/voucher", voucherRouter.getRouter());
    this.app.use("/coupon", couponRouter.getRouter());
    this.app.use("/transaction", transactionRouter.getRouter());
    this.app.use("/review", reviewRouter.getRouter());
  }

  private handleError() {
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
      console.log("✅ Cron jobs initialized");
    });
  }
}