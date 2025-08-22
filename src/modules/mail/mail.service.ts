import { createTransport, Transporter } from "nodemailer";
import Handlebars from "handlebars";
import path from "path";
import fs from "fs/promises";

export class MailService {
    private transporter: Transporter;

    constructor() {
        this.transporter = createTransport({
            service: "gmail",
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD
            }
        })
    }

    sendMail = async (to: string, subject: string, templateName: string, context: any) => {
        const templateDir = path.resolve(__dirname, "templates");
        const templatePath = path.join(templateDir, `${templateName}.hbs`);
        const templateSource = await fs.readFile(templatePath, "utf-8");
        const template = Handlebars.compile(templateSource);
        const html = template(context);

        await this.transporter.sendMail({
            from: process.env.MAIL_USER,
            to,
            subject,
            html
        })
    }
}