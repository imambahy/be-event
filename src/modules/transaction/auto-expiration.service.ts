import { TransactionService } from "./transaction.service";

export class AutoExpirationService {
  static async autoExpireTransactions() {
    const transactionService = new TransactionService();
    
    try {
      const expiredTransactions = await transactionService.getExpiredTransactions();

      for (const transaction of expiredTransactions) {
        await transactionService.updateTransactionStatus(
          transaction.id, 
          "EXPIRED",
          { isAutoProcess: true }
        );
      }

      console.log(`Auto-expired ${expiredTransactions.length} transactions`);
    } catch (error) {
      console.error("Auto-expiration error:", error);
    }
  }

  static async autoCancelTransactions() {
    const transactionService = new TransactionService();
    
    try {
      const pendingTransactions = await transactionService.getPendingTransactions();

      for (const transaction of pendingTransactions) {
        await transactionService.updateTransactionStatus(
          transaction.id, 
          "CANCELLED",
          { isAutoProcess: true }
        );
      }

      console.log(`Auto-cancelled ${pendingTransactions.length} transactions`);
    } catch (error) {
      console.error("Auto-cancellation error:", error);
    }
  }
}