import multer from "multer";
import core, { fromBuffer } from "file-type/core";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import path from "path";
import fs from "fs";

export class UploadMiddleware {
  // Untuk payment proof (single file)
  uploadPaymentProof = () => {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "payment_proof_" + uniqueSuffix + path.extname(file.originalname));
      },
    });

    const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

    return multer({ 
      storage, 
      limits,
      fileFilter: (req, file, cb) => {
        // Check file type
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
        if (!allowedTypes.includes(file.mimetype)) {
          return cb(new Error("Only JPEG, PNG, JPG, and PDF files are allowed"));
        }
        cb(null, true);
      }
    }).single("paymentProof");
  };

  // Untuk multiple files
  upload = () => {
    const storage = multer.memoryStorage();
    const limits = { fileSize: 2 * 1024 * 1024 }; // 2mb

    return multer({ storage, limits });
  };

  fileFilter = (allowedTypes: core.MimeType[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || Object.values(files).length === 0) {
        return next();
      }

      for (const fieldname in files) {
        const fileArray = files[fieldname];

        for (const file of fileArray) {
          const type = await fromBuffer(file.buffer);

          if (!type || !allowedTypes.includes(type.mime)) {
            throw new ApiError("Invalid file type", 400);
          }
        }
      }

      next();
    };
  };

  // Error handling middleware
  handleUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "File size must be less than 5MB",
        });
      }
    }
    
    if (err.message) {
      return res.status(400).json({
        message: err.message,
      });
    }
    
    next(err);
  };
}