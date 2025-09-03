import { Request, Response, NextFunction } from "express";
import { VoucherService } from "./voucher.service";
import { ApiError } from "../../utils/api-error";

export class VoucherController {
  private voucherService: VoucherService;

  constructor() {
    this.voucherService = new VoucherService();
  }

  createVoucher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can create vouchers", 403);
      }

      const organizerId = (req as any).user.id;
    const result = await this.voucherService.createVoucher(organizerId, req.body);
    res.status(201).send(result);
    } catch (error) {
      next(error);
    }
  };

  getVouchers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can view vouchers", 403);
      }

      const organizerId = (req as any).user.id;
    const result = await this.voucherService.getVouchers(organizerId);
    res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getVoucherById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can view voucher details", 403);
      }

    const id = Number(req.params.id);
      const organizerId = (req as any).user.id;
    const result = await this.voucherService.getVoucherById(id, organizerId);
    res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  updateVoucher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can update vouchers", 403);
      }

    const id = Number(req.params.id);
      const organizerId = (req as any).user.id;
    const result = await this.voucherService.updateVoucher(id, organizerId, req.body);
    res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  deleteVoucher = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can delete vouchers", 403);
      }

    const id = Number(req.params.id);
      const organizerId = (req as any).user.id;
    const result = await this.voucherService.deleteVoucher(id, organizerId);
    res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };

  getVoucherStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can view voucher stats", 403);
      }

      const organizerId = (req as any).user.id;
    const result = await this.voucherService.getVoucherStats(organizerId);
    res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}