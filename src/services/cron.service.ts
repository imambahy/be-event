import cron from "node-cron";
import { AutoExpirationService } from "../modules/transaction/auto-expiration.service";

export class CronService {

  static init() {
    if (process.env.CRON_ENABLED !== 'false') {
      this.setupAutoExpiration();
      this.setupAutoCancellation();
      // console.log("Cron jobs initialized");
    }
  }

  private static setupAutoExpiration() {
    cron.schedule("* * * * *", async () => { //cron schedule setiap menit
      console.log("🕐 Running auto-expiration check..."); //log setiap menit
      try {
        await AutoExpirationService.autoExpireTransactions();
      } catch (error) {
        console.error("❌ Auto-expiration error:", error);
      }
    });
  }

  private static setupAutoCancellation() {
    cron.schedule("0 * * * *", async () => { //cron schedule setiap jam
      console.log("🕐 Running auto-cancellation check..."); //log setiap jam
      try {
        await AutoExpirationService.autoCancelTransactions();
      } catch (error) {
        console.error("❌ Auto-cancellation error:", error);
      }
    });
  }
}