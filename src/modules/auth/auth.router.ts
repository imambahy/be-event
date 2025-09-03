import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateRegister, validateLogin } from "../../validators/auth.validator";

export class AuthRouter {
  private router: Router;
  private authController: AuthController;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.post("/register", validateRegister, this.authController.register);
    this.router.post("/login", validateLogin, this.authController.login);
  };

  getRouter = () => {
    return this.router;
  };
}