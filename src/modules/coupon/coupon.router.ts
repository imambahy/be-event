import { Router } from "express";
import { CouponController } from "./coupon.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateCreateCoupon, validateUpdateCoupon } from "../../validators/coupon.validator";

export class CouponRouter {
  private router: Router;
  private couponController: CouponController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.couponController = new CouponController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    // Public routes - Get all active coupons
    this.router.get("/coupons", this.couponController.getCoupons);

    // Protected routes - Need authentication
    this.router.use(this.jwtMiddleware.verifyToken(process.env.JWT_SECRET || "secret"));
    
    // Organizer routes - System coupon management
    this.router.post("/coupons", validateCreateCoupon, this.couponController.createCoupon);
    this.router.get("/coupons/stats", this.couponController.getCouponStats);
    this.router.get("/coupons/:id", this.couponController.getCouponById);
    this.router.put("/coupons/:id", validateUpdateCoupon, this.couponController.updateCoupon);
    this.router.delete("/coupons/:id", this.couponController.deleteCoupon);

    // Customer routes - User's coupons
    this.router.get("/user-coupons", this.couponController.getUserCoupons);
  };

  getRouter = () => {
    return this.router;
  };
}