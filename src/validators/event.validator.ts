import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

const { body, query, param, validationResult } = require("express-validator");

export const validateCreateEvent = [
  body("title").notEmpty().withMessage("Title is required").isLength({ min: 3, max: 100 }).withMessage("Title must be between 3 and 100 characters"),
  body("description").notEmpty().withMessage("Description is required").isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
  body("category").notEmpty().withMessage("Category is required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("startDate").isISO8601().withMessage("Start date must be a valid date"),
  body("endDate").isISO8601().withMessage("End date must be a valid date"),
  body("ticketTypes").isArray({ min: 1 }).withMessage("At least one ticket type is required"),
  body("ticketTypes.*.name").notEmpty().withMessage("Ticket type name is required"),
  body("ticketTypes.*.price").isInt({ min: 0 }).withMessage("Price must be a non-negative integer"),
  body("ticketTypes.*.totalSeats").isInt({ min: 1 }).withMessage("Total seats must be at least 1"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new ApiError(errors.array()[0].msg, 400);
    }

    next();
  }
];

export const validateUpdateEvent = [
  param("id").isInt().withMessage("Event ID must be a valid integer"),
  body("title").optional().isLength({ min: 3, max: 100 }).withMessage("Title must be between 3 and 100 characters"),
  body("description").optional().isLength({ min: 10 }).withMessage("Description must be at least 10 characters"),
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

export const validateGetEvents = [
  query("search").optional().isString().withMessage("Search must be a string"),
  query("category").optional().isString().withMessage("Category must be a string"),
  query("location").optional().isString().withMessage("Location must be a string"),
  query("sortBy").optional().isIn(["createdAt", "startDate", "title", "price"]).withMessage("Invalid sort option"),
  query("order").optional().isIn(["asc", "desc"]).withMessage("Order must be asc or desc"),
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new ApiError(errors.array()[0].msg, 400);
    }

    next();
  }
];