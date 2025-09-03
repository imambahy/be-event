// src/modules/transaction/transaction.controller.ts
import { Request, Response, NextFunction } from "express";
import { TransactionService } from "./transaction.service";
import { ApiError } from "../../utils/api-error";

export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  // Customer endpoint - create transaction
  createTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is customer
      if ((req as any).user?.role !== "CUSTOMER") {
        throw new ApiError("Only customers can create transactions", 403);
      }

      const userId = (req as any).user.id;
      const eventId = Number(req.params.eventId);
      const result = await this.transactionService.createTransaction(userId, eventId, req.body);
      
      res.status(201).json({
        message: "Transaction created successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  // Customer & Organizer endpoint - get transactions
  getTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;
      const result = await this.transactionService.getTransaction(userId, role);
      
      res.status(200).json({
        message: "Transactions retrieved successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  // Customer & Organizer endpoint - get transaction by id
  getTransactionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const userId = (req as any).user.id;
      const role = (req as any).user.role;
      const result = await this.transactionService.getTransactionById(id, userId, role);
      
      res.status(200).json({
        message: "Transaction retrieved successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  // Organizer endpoint - update transaction status
  updateTransactionStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can update transaction status", 403);
      }

      const id = Number(req.params.id);
      const organizerId = (req as any).user.id;
      const result = await this.transactionService.updateTransactionStatus(
        id, 
        req.body.status, 
        { organizerId }
      );
      
      res.status(200).json({
        message: "Transaction status updated successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  // Customer endpoint - upload payment proof
  uploadPaymentProof = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transactionId = parseInt(req.params.id);
      const userId = (req as any).user.id;

      // get file path dari multer
      const paymentProof = req.file ? req.file.path : null;

      if(!paymentProof) {
        throw new ApiError("Payment proof is required", 400);
      }

       // Check if user is customer
       if ((req as any).user?.role !== "CUSTOMER") {
        throw new ApiError("Only customers can upload payment proof", 403);
      }

      const transaction = await this.transactionService.uploadPaymentProof(transactionId, userId, paymentProof);

      res.status(200).json({
        message: "Payment proof uploaded successfully",
        data: transaction
      });
    } catch (error) {
      next(error);
    }
  };

  // Organizer endpoint - get transaction stats
  getTransactionStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is organizer
      if ((req as any).user?.role !== "ORGANIZER") {
        throw new ApiError("Only organizers can view transaction stats", 403);
      }

      const organizerId = (req as any).user.id;
      const result = await this.transactionService.getTransactionStats(organizerId);
      
      res.status(200).json({
        message: "Transaction stats retrieved successfully",
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}