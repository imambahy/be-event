import { Router } from "express";
import { SampleController } from "./sample.controller";
import {
  validateCreateSample,
  validateSendEmail,
} from "../../validators/sample.validator";
import { UploadMiddleware } from "../../middlewares/upload.middleware";

export class SampleRouter {
  private router: Router;
  private sampleController: SampleController;
  private uploadMiddleware: UploadMiddleware;
  constructor() {
    this.router = Router();
    this.sampleController = new SampleController();
    this.uploadMiddleware = new UploadMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get("/", this.sampleController.getSamples);
    this.router.get("/:id", this.sampleController.getSample);
    this.router.post(
      "/",
      validateCreateSample,
      this.sampleController.createSample
    );
    this.router.post(
      "/send-email",
      validateSendEmail,
      this.sampleController.sendEmail
    );
    this.router.post(
      "/upload",
      this.uploadMiddleware.upload().fields([{ name: "image", maxCount: 1 }]),
      this.uploadMiddleware.fileFilter(["image/jpeg", "image/png"]),
      this.sampleController.uploadImage
    );
  };

  getRouter = () => {
    return this.router;
  };
}
