import { ApiError } from "../../utils/api-error";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

// Define Sample interface locally since it's not in the schema
interface Sample {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    // Mock data since sample table doesn't exist in schema
    const samples: Sample[] = [
      { id: 1, name: "Sample 1", createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: "Sample 2", createdAt: new Date(), updatedAt: new Date() },
    ];
    return samples;
  };

  getSample = async (id: number) => {
    // Mock data since sample table doesn't exist in schema
    const samples: Sample[] = [
      { id: 1, name: "Sample 1", createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: "Sample 2", createdAt: new Date(), updatedAt: new Date() },
    ];

    const sample = samples.find((s) => s.id === id);
    if (!sample) throw new ApiError("sample not found", 404);

    return sample;
  };

  createSample = async (body: { name: string }) => {
    // Mock implementation since sample table doesn't exist in schema
    console.log("Creating sample with name:", body.name);
    return { message: "create sample success" };
  };

  sendEmail = async (email: string) => {
    await this.mailService.sendMail(email, "Welcome to the jungle", "welcome", {
      email: email,
    });
    return { message: "email sent successfully" };
  };

  uploadImage = async (image: Express.Multer.File) => {
    const { secure_url } = await this.cloudinaryService.upload(image);

    return { message: "upload image success", url: secure_url };
  };
}
