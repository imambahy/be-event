import { Router } from "express";
import { VoucherController } from "./voucher.controller";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { validateCreateVoucher, validateUpdateVoucher } from "../../validators/voucher.validator";

export class VoucherRouter {
  private router: Router;
  private voucherController: VoucherController;
  private jwtMiddleware: JwtMiddleware;

  constructor() {
    this.router = Router();
    this.voucherController = new VoucherController();
    this.jwtMiddleware = new JwtMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    // Semua route voucher butuh autentikasi dan role organizer
    this.router.use(this.jwtMiddleware.verifyToken(process.env.JWT_SECRET || "secret"));
    
    this.router.post("/vouchers", validateCreateVoucher, this.voucherController.createVoucher);
    this.router.get("/vouchers", this.voucherController.getVouchers);
    this.router.get("/vouchers/stats", this.voucherController.getVoucherStats);
    this.router.get("/vouchers/:id", this.voucherController.getVoucherById);
    this.router.put("/vouchers/:id", validateUpdateVoucher, this.voucherController.updateVoucher);
    this.router.delete("/vouchers/:id", this.voucherController.deleteVoucher);
  };

  getRouter = () => {
    return this.router;
  };
}