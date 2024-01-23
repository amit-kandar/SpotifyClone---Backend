import logger from "../config/logger";
import redisClient from "../config/redis";
import { Artist } from "../models/artist.model";
import { User } from "../models/user.model";
import { RequestDocument } from "../types/express";
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
            throw new APIError(401, "Unauthorized Request, Signin Again");

        // fetch token secret
        const secret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
        if (!secret)
            throw new APIError(500, "Secret not found in environment variables");

        // validate access token and store decoded token
        const decoded: JwtPayload | string = jwt.verify(token, secret);
        if (typeof decoded === "string")
            throw new APIError(400, "Invalid Decoded Information");

        // retrieve the user from redis
        try {
            let userData = await redisClient.get(`${decoded._id}`);

            if (!userData) {
                let user
                user = await User.findById(decoded._id).select("-password -refreshToken");

                if (!user) {
                    throw new APIError(404, "Invalid Authentication Token");
                }

                user = user.toObject();

                if (user.role === 'artist') {
                    const artist = await Artist.findOne({ user: user._id });

                    if (!artist) {
                        throw new APIError(404, "User is not an artist");
                    }

                    const userDetails = {
                        ...user,
                        ...artist.toObject()
                    };

                    const newUserDetails: RequestDocument = {
                        _id: userDetails.user,
                        artist_id: userDetails._id,
                        name: userDetails.name,
                        username: userDetails.username,
                        role: userDetails.role,
                        email: userDetails.email,
                        date_of_birth: userDetails.date_of_birth,
                        genre: userDetails.genre,
                        bio: userDetails.bio,
                        totalLikes: userDetails.totalLikes,
                        avatar: {
                            url: userDetails.avatar.url,
                            public_id: userDetails.avatar.public_id
                        }
                    }

                    req.user = newUserDetails;
                    await redisClient.setEx(`${decoded._id}`, 3600, JSON.stringify(newUserDetails));
                } else {
                    req.user = user;
                }
            } else {
                const user = JSON.parse(userData);
                req.user = user;
            }

        } catch (error) {
            next(error);
        }

    } catch (error) {
        next(error);
    }

    logger.info(`Authentication successful for user: ${req.user?.username}`);

    next();
});
