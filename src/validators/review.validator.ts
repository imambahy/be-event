import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

const { body, param, validationResult } = require("express-validator");

export const validateCreateReview = [
  param("eventId").isInt({ min: 1 }).withMessage("Event ID must be a valid integer"),
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").notEmpty().withMessage("Comment is required").isLength({ min: 10, max: 500 }).withMessage("Comment must be between 10 and 500 characters"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new ApiError(errors.array()[0].msg, 400);
    }

    next();
  }
];

export const validateUpdateReview = [
  param("id").isInt({ min: 1 }).withMessage("Review ID must be a valid integer"),
  body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
  body("comment").optional().isLength({ min: 10, max: 500 }).withMessage("Comment must be between 10 and 500 characters"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new ApiError(errors.array()[0].msg, 400);
    }

    next();
  }
];