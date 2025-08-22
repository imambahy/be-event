import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { fromBuffer, MimeType } from "file-type/core";
import { ApiError } from "../utils/api-error";

export class UploadMiddleware {
    
    upload = () => {
        const storage = multer.memoryStorage()

        const limits = {fileSize: 2 * 1024 * 1024} //2 mb
        return multer({storage, limits})
    }

    fileFilter = (allowedTypes: MimeType[]) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] }

            if(!files || Object.values(files).length === 0){
                return next()
            } 

            for(const fieldname in files){
                const fileArray = files[fieldname]

                for(const file of fileArray){
                    const type = await fromBuffer(file.buffer)

                    if(!type || !allowedTypes.includes(type.mime as MimeType)){
                        throw new ApiError("invalid file type", 400)
                    }
                }
            }

            next()
        }
    }
}