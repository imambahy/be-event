import { Sample } from "../../generated/prisma";
import { ApiError } from "../../utils/api-error";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

export class SampleService {
  private prisma: PrismaService;
  private mailService: MailService;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = new PrismaService();
    this.mailService = new MailService();
    this.cloudinaryService = new CloudinaryService();
  }

  getSamples = async () => {
    const samples = await this.prisma.sample.findMany();
    return samples;
  };

  getSample = async (id: number) => {
    const sample = await this.prisma.sample.findFirst({
      where: { id },
    });

    if (!sample) throw new ApiError("sample not found", 404);

    return sample;
  };
  
  createSample = async (body: Pick<Sample, "name">) => {
    await this.prisma.sample.create({
      data: body,
    })

    return {message: "create sample success"}
  }

  sendEmail = async (email: string) => {
    await this.mailService.sendMail(email, "Welcome to the jungle", "welcome", {email: email})
    return {message: "email sent successfully"}
  }

  uploadImage = async (image: Express.Multer.File) => {
    const { secure_url } = await this.cloudinaryService.upload(image)

    return {message: "upload image success", url: secure_url}
  }
}
