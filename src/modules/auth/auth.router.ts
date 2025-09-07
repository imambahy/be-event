import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateRegister, validateLogin, validateUpdateProfile, validateChangePassword, validateResetPassword, validateResetPasswordWithToken } from "../../validators/auth.validator";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploadMiddleware } from "../../middlewares/upload.middleware";
import { ApiError } from "../../utils/api-error";

export class AuthRouter {
  private router: Router;
  private authController: AuthController;
  private jwtMiddleware: JwtMiddleware;
  private uploadMiddleware: UploadMiddleware;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploadMiddleware = new UploadMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.post("/register", validateRegister, this.authController.register);
    this.router.post("/login", validateLogin, this.authController.login);
    this.router.post("/reset-password", validateResetPassword, this.authController.resetPassword);
    this.router.post("/reset-password/confirm", validateResetPasswordWithToken, this.authController.resetPasswordWithToken);
    
    // Protected routes
    this.router.get("/profile", this.jwtMiddleware.verifyToken(this.getJwtSecret()), this.authController.getProfile);
    this.router.put("/profile",
      this.jwtMiddleware.verifyToken(this.getJwtSecret()),
      this.uploadMiddleware.uploadAvatar(),
      this.uploadMiddleware.handleUploadError,
      validateUpdateProfile,
      this.authController.updateProfile
    );
    this.router.put("/change-password", this.jwtMiddleware.verifyToken(this.getJwtSecret()), validateChangePassword, this.authController.changePassword);
  };

  getRouter = () => {
    return this.router;
  };

  private getJwtSecret = (): string => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new ApiError("JWT_SECRET environment variable is required", 500);
    }
    return jwtSecret;
  };
}