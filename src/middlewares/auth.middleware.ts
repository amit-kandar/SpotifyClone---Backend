import logger from "../config/logger";
import redisClient from "../config/redis";
import { User } from "../models/user.model";
import { APIError } from "../utils/APIError";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export const checkAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // get access token
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        // if token not found send unauthorized user
        if (!token) {
            const errorMessage = "Unauthorized Request, signin again";
            logger.warn(`Authentication failed: ${errorMessage}`);
            throw new APIError(401, errorMessage);
        }

        // fetch token secret
        const secret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
        if (!secret) {
            const errorMessage = "Secret not found in environment variables";
            logger.error(errorMessage);
            throw new APIError(500, errorMessage);
        }

        // validate access token and store decoded token
        const decoded: JwtPayload | string = jwt.verify(token, secret);
        if (typeof decoded === "string") {
            const errorMessage = "Invalid decoded information";
            logger.error(errorMessage);
            throw new APIError(400, errorMessage);
        }

        // retrieve the user
        let userData;
        try {
            userData = await redisClient.get(`user:${decoded._id}`);
        } catch (err) {
            const errorMessage = "Error while fetching details from redis";
            logger.error(errorMessage, { error: err });
            throw new APIError(500, errorMessage);
        }

        let user;
        if (!userData) {
            user = await User.findById(decoded._id).select("-password -refreshToken");
            if (!user) {
                const errorMessage = "Invalid access token";
                logger.error(errorMessage);
                throw new APIError(404, errorMessage);
            }
        } else {
            user = JSON.parse(userData);
        }

        // set user into req.user
        req.user = user;

        logger.info(`Authentication successful for user: ${user.username}`);

        // call next()
        next();

    } catch (error) {
        next(error);
    }
});
