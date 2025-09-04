import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateRegister, validateLogin, validateResetPassword, validateUpdateUser } from "../../validators/auth.validator";
import { JwtMiddleware } from "../../middlewares/jwt.middleware";
import { UploadMiddleware } from "../../middlewares/upload.middleware";
import { validateSendEmail } from "../../validators/auth.validator";

export class AuthRouter {
  private router: Router;
  private authController: AuthController;
  private jwtMiddleware: JwtMiddleware;
  private uploaderMiddleware: UploadMiddleware;
  


  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.jwtMiddleware = new JwtMiddleware();
    this.uploaderMiddleware = new UploadMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes () {
    this.router.get("/", this.authController.getUsers);
    this.router.get("/profile/:id", this.authController.getUser);
    
    this.router.post("/register", validateRegister, this.authController.register);
    this.router.post("/login", validateLogin, this.authController.login);
    this.router.post("/send-email", validateSendEmail, this.authController.sendEmail);
    this.router.post(
      "/upload", 
      this.uploaderMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      this.uploaderMiddleware.fileFilter(["image/jpeg", "image/png", "image/png"]),
      this.authController.uploadImage
    );

    this.router.post("/forgot-password", this.authController.forgotPassword)
    this.router.patch(
      "/reset-password", 
      this.jwtMiddleware.
      verifyToken(process.env.JWT_SECRET!),
      validateResetPassword,
      this.authController.resetPassword
    );
    this.router.patch(
      "/update-user/:id", 
      validateUpdateUser,
      this.jwtMiddleware.verifyToken(process.env.JWT_SECRET!), 
      this.authController.updateUser
    )
  };

  getRouter = () => {
    return this.router;
  };
}
