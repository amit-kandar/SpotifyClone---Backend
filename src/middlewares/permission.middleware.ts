import { APIError } from "../utils/APIError";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import logger from "../config/logger"; // Import your logger instance here

export const checkRole = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // get access token
            const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

            // if token not found send unauthorized user
            if (!token) {
                const errorMessage = "Unauthorized Request";
                logger.warn(`Role check failed: ${errorMessage}`);
                throw new APIError(401, errorMessage);
            }

            // fetch token secret
            const secret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
            if (!secret) {
                const errorMessage = "Secret not found";
                logger.error(errorMessage);
                throw new APIError(404, errorMessage);
            }

            // validate access token and store decoded token
            const decoded: JwtPayload | string = jwt.verify(token, secret);
            if (typeof decoded === "string") {
                const errorMessage = "Invalid decoded information";
                logger.error(errorMessage);
                throw new APIError(400, errorMessage);
            }

            // Check if the userType is included in the allowedUserTypes array
            if (!roles.includes(decoded.role)) {
                const errorMessage = "Access denied. Insufficient permission.";
                logger.warn(`Role check failed: ${errorMessage}`);
                throw new APIError(403, errorMessage);
            }

            logger.info(`Role check successful for role: ${decoded.role}`);
            next();
        } catch (error) {
            next(error);
        }
    };
};
