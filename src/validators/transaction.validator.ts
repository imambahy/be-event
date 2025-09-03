import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

const { body, param, validationResult } = require("express-validator");

export const validateCreateTransaction = [
  param("eventId").isInt({ min: 1 }).withMessage("Event ID must be a valid integer"),
  body("ticketTypeId").isInt({ min: 1 }).withMessage("Ticket type ID must be a valid integer"),
  body("quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  body("pointsUsed").optional().isInt({ min: 0 }).withMessage("Points used must be a non-negative integer"),
  body("couponCode").optional().isString().withMessage("Coupon code must be a string"),
  body("voucherCode").optional().isString().withMessage("Voucher code must be a string"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new ApiError(errors.array()[0].msg, 400);
    }

    next();
  }
];

export const validateUpdateTransactionStatus = [
  param("id").isInt({ min: 1 }).withMessage("Transaction ID must be a valid integer"),
  body("status").isIn(["WAITING_FOR_PAYMENT", "WAITING_FOR_CONFIRMATION", "DONE", "REJECTED", "EXPIRED", "CANCELLED"]).withMessage("Invalid transaction status"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new ApiError(errors.array()[0].msg, 400);
    }

    next();
  }
];