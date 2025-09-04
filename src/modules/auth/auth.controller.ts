import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    res.status(200).send(result);
  };
  login = async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.authService.login(req.body);
    res.status(200).send(result);
  };

  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.authService.getUsers();
    res.status(200).send(result);
  };

  getUser = async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    const result = await this.authService.getUserById(id);
    res.status(200).send(result);
  };

  sendEmail = async (req: Request, res: Response) => {
    const result = await this.authService.sendEmail(req.body.email);
    res.status(200).send(result);
  };

  uploadImage = async (req: Request, res: Response) => {
    const files = req.files as { [filename: string]: Express.Multer.File[] };
    const image = files.image?.[0];
    const result = await this.authService.uploadImage(image);
    res.status(200).send(result);
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.authService.forgotPassword(req.body);
    res.status(200).send(result);
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const authUserId = res.locals.user.id;
    const result = await this.authService.resetPassword(req.body, authUserId);
    res.status(200).send(result);
  };

  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Number(req.params.id);
      const userData = req.body;
      const result = await this.authService.updateUser(id, userData);
      res.status(200).send(result);
    } catch (error) {
      next(error);
    }
  };
}
