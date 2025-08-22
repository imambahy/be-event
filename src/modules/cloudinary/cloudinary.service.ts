import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { Readable } from "stream";

export class CloudinaryService {
    constructor() {
        cloudinary.config({
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME
        })
    }

    private bufferToStream = (buffer: Buffer) => {
        const readable = new Readable()
        readable._read = () => {}
        readable.push(buffer)
        readable.push(null)
        return readable
    }

    upload = async (file: Express.Multer.File): Promise<UploadApiResponse> => {
        const stream = this.bufferToStream(file.buffer)

        return new Promise((resolve, reject) => { //resoleve dan reject itu callback, callback adalah fungsi yang akan dieksekusi setelah promise selesai
            const readableStream = this.bufferToStream(file.buffer)

            const uploadStream = cloudinary.uploader.upload_stream((err, result) => {
                if(err) return reject(err)

                if(!result) return reject(new Error("upload failed"))

                resolve(result)
            })

            readableStream.pipe(uploadStream)
        })
    }
}