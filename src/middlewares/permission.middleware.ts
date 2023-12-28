import { APIError } from "../utils/APIError";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const checkRole = (roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // get access token
            const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

            // if token not found send unauthorized user
            if (!token) throw new APIError(401, "Unauthorized Request");

            // fetch token secret
            const secret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
            if (!secret) throw new APIError(404, "Secret not found");

            // validate access token and store decoded token
            const decoded: JwtPayload | string = jwt.verify(token, secret);
            if (typeof decoded === "string") throw new APIError(400, "Invalid decoded information");

            // Check if the userType is included in the allowedUserTypes array
            if (!roles.includes(decoded.role)) throw new APIError(403, "Access denied. Insufficient permission.");

            next();
        } catch (error) {
            next(error);
        }
    };
};
