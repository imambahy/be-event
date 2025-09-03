import { NextFunction, Request, Response } from "express";
import { verify } from "jsonwebtoken";
import { ApiError } from "../utils/api-error";

export class JwtMiddleware {
  verifyToken = (secretKey: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) throw new ApiError("unauthorized", 401);

      verify(token, secretKey, (err, payload) => {
        if (err) {
          throw new ApiError("Token expired/Invalid token", 401);
        }

        (req as any).user = payload;
        next();
      });
    };
  };
}
