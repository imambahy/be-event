import { Request, Response } from "express";
import { AuthService } from "./auth.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    res.status(201).send(result);
  };

  login = async (req: Request, res: Response) => {
    const result = await this.authService.login(req.body);
    res.status(200).send(result);
  };

  getProfile = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const result = await this.authService.getProfile(userId);
    res.status(200).send(result);
  };

  updateProfile = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    
    // Handle both JSON and form-data
    const updateData: { name?: string; avatar?: string } = {};
    
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.avatar) updateData.avatar = req.body.avatar;
    
    // Handle file upload for avatar
    if (req.file) {
      updateData.avatar = req.file.path;
    }
    
    const result = await this.authService.updateProfile(userId, updateData);
    res.status(200).send(result);
  };

  changePassword = async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;
    const result = await this.authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).send(result);
  };

  resetPassword = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await this.authService.resetPassword(email);
    res.status(200).send(result);
  };

  resetPasswordWithToken = async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    const result = await this.authService.resetPasswordWithToken(token, newPassword);
    res.status(200).send(result);
  };
}