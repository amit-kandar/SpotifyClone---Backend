import { NextFunction, Request, Response } from "express";
import { APIError } from "../utils/APIError";

export const errorHandler = (
    err: APIError | Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = 500;
    let message = "Internal Server Error";
    let errors: Array<string> = [];
    let data: any = null;

    if (err instanceof APIError) {
        statusCode = err.statusCode;
        message = err.message;
        errors = err.errors;
        data = err.data;
    }

    // Log the error here

    res.status(statusCode).json({
        statusCode,
        success: false,
        message,
        errors,
        data,
    });
};
