import { Request, Response, NextFunction } from "express";
import { CouponService } from "./coupon.service";
import { ApiError } from "../../utils/api-error";

export class CouponController {
  private couponService: CouponService;

  constructor() {
    this.couponService = new CouponService();
  }

  // ADMIN/ORGANIZER ONLY - Create system-wide coupons
  createCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer (admin functionality)
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can create system coupons", 403);
      }

      const result = await this.couponService.createCoupon(req.body);
      res.status(201).send(result);
    } catch (error) {
      next(error);
    }
  };

  // PUBLIC - Get all active coupons
  getCoupons = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.couponService.getCoupons();
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // ADMIN/ORGANIZER ONLY - Get coupon details
  getCouponById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can view coupon details", 403);
      }

      const id = Number(req.params.id);
      const result = await this.couponService.getCouponById(id);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // ADMIN/ORGANIZER ONLY - Update system coupons
  updateCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can update system coupons", 403);
      }

      const id = Number(req.params.id);
      const result = await this.couponService.updateCoupon(id, req.body);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // ADMIN/ORGANIZER ONLY - Delete system coupons
  deleteCoupon = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can delete system coupons", 403);
      }

      const id = Number(req.params.id);
      const result = await this.couponService.deleteCoupon(id);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // ADMIN/ORGANIZER ONLY - Get coupon statistics
  getCouponStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can view coupon statistics", 403);
      }

      const result = await this.couponService.getCouponStats();
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  // CUSTOMER ONLY - Get user's available coupons
  getUserCoupons = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is customer
      if ((req as any).user?.role !== "CUSTOMER") {
        throw new ApiError("Only customers can view their coupons", 403);
      }

      const userId = (req as any).user.id;
      const result = await this.couponService.getUserCoupons(userId);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}