import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

const { body, param, validationResult } = require("express-validator");

export const validateCreateVoucher = [
  body("code").notEmpty().withMessage("Voucher code is required").isLength({ min: 3, max: 20 }).withMessage("Code must be between 3 and 20 characters"),
  body("discountValue").isInt({ min: 1 }).withMessage("Discount value must be a positive integer"),
  body("eventId").isInt({ min: 1 }).withMessage("Event ID must be a valid integer"),
  body("usageLimit").isInt({ min: 1 }).withMessage("Usage limit must be at least 1"),
  body("startDate").isISO8601().withMessage("Start date must be a valid date"),
  body("endDate").isISO8601().withMessage("End date must be a valid date"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new ApiError(errors.array()[0].msg, 400);
    }

    next();
  }
];

export const validateUpdateVoucher = [
  param("id").isInt().withMessage("Voucher ID must be a valid integer"),
  body("code").optional().isLength({ min: 3, max: 20 }).withMessage("Code must be between 3 and 20 characters"),
  body("discountValue").optional().isInt({ min: 1 }).withMessage("Discount value must be a positive integer"),
  body("usageLimit").optional().isInt({ min: 1 }).withMessage("Usage limit must be at least 1"),
  body("startDate").optional().isISO8601().withMessage("Start date must be a valid date"),
  body("endDate").optional().isISO8601().withMessage("End date must be a valid date"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new ApiError(errors.array()[0].msg, 400);
    }

    next();
  }
];