import { NextFunction, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { ApiError } from "../utils/api-error";

export const validateCreateSample = [
    body("name").notEmpty().withMessage("name is required").isString().withMessage("name must be a string"),

    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req)

        if(!errors.isEmpty()) {
            throw new ApiError(errors.array()[0].msg, 400)
        }

        next()
    }
]

export const validateSendEmail = [
    body("email").notEmpty().withMessage("email is required").isEmail().withMessage("email must be a valid email"),

    (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req)

        if(!errors.isEmpty()) {
            throw new ApiError(errors.array()[0].msg, 400)
        }

        next()
    }
]