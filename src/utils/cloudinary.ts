import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import fs from 'fs';

// Define the configuration parameters
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

const MAX_UPLOAD_TRIES = 2;

export const uploadToCloudinary = async (filePath: string): Promise<UploadApiResponse | string> => {
    let tries = 0;

    while (tries < MAX_UPLOAD_TRIES) {
        try {
            if (!filePath) throw new Error("File path is required!");

            // Upload the file to Cloudinary
            const response = await cloudinary.uploader.upload(filePath, {
                resource_type: "auto"
            });

            // File uploaded successfully
            console.log("File uploaded successfully ", response);
            return response;
        } catch (error) {
            tries++;

            if (tries === MAX_UPLOAD_TRIES) {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath); // Remove the local saved temp file if it exists after maximum tries
                }
                return "Cloudinary file upload operation failed after multiple attempts!";
            }
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Delete the temporary file after successful file upload or after maximum tries
            }
        }
    }

    return "Cloudinary file upload operation failed after multiple attempts!";
};
