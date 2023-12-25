import fs from 'fs';
import path from 'path';

class APIError extends Error {
    statusCode: number;
    message: string;
    errors: Array<string>;
    stack?: string;
    data: any;
    success: boolean;

    constructor(
        statusCode: number,
        message: string = "Something went wrong",
        errors: Array<string> = [],
        stack: string = ""
    ) {
        super(message);
        this.message = message;
        this.errors = errors;
        this.statusCode = statusCode;
        this.data = null;
        this.success = false;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }

        // File deletion logic within the constructor
        /**
         * when we get error and also multer middleware add image in temp folder.
         * That time we should remove the file from temp.
         */
        const directoryPath = 'public/temp/';

        fs.readdir(directoryPath, (err: NodeJS.ErrnoException | null, files: string[]) => {
            if (err) {
                console.error('Error reading directory:', err);
                return;
            }

            files.forEach((file) => {
                if (path.extname(file) === '.png') {
                    const filePath = path.join(directoryPath, file);
                    fs.unlink(filePath, (error: NodeJS.ErrnoException | null) => {
                        if (error) {
                            console.error(`Error deleting file ${filePath}:`, error);
                        }
                    });
                }
            });
        });
    }


}

export { APIError };
