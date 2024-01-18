import logger from "../config/logger";
import redisClient from "../config/redis";
import { Artist } from "../models/artist.model";
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
        if (!token)
            throw new APIError(401, "Unauthorized Request, signin again");

        // fetch token secret
        const secret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
        if (!secret)
            throw new APIError(500, "Secret not found in environment variables");

        // validate access token and store decoded token
        const decoded: JwtPayload | string = jwt.verify(token, secret);
        if (typeof decoded === "string")
            throw new APIError(400, "Invalid decoded information");

        // retrieve the user from redis
        let userData;
        try {
            userData = await redisClient.get(`${decoded._id}`);
        } catch (err) {
            throw new APIError(500, "Error while fetching details from redis");
        }
        let user;
        if (!userData) {
            user = await User.findById(decoded._id).select("-password -refreshToken");
            if (!user)
                throw new APIError(404, "Invalid access token");
        } else {
            user = JSON.parse(userData);
        }

        if (user?.role === "artist") {
            const artist = await Artist.findOne({ user: user._id });

            if (!artist)
                throw new APIError(404, "Invalid access token");

            req.user = {
                ...user.toObject(),
                details: { ...artist.toObject() }
            };
        } else {
            req.user = user;
        }

        //log on successfull authentication
        logger.info(`Authentication successful for user: ${user?.username}`);

        // call next()
        next();

    } catch (error) {
        next(error);
    }
});
