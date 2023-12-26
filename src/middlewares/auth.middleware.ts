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
        if (!token) throw new APIError(401, "Unauthorized Request");

        // fetch token secret
        const secret: string | undefined = process.env.ACCESS_TOKEN_SECRET;
        if (!secret) throw new APIError(404, "secrete not found");

        // validate access token and store decoded token
        const decoded: JwtPayload | string = jwt.verify(token, secret);
        if (typeof decoded === "string") throw new APIError(400, "Invalid decoded information");

        // retrive the user
        const user = await User.findById(decoded._id).select("-password -refreshToken");
        if (!user) throw new APIError(404, "Invalid access token");
        // set user into req.user
        req.user = user;
        // call next()
        next();
    } catch (error) {
        throw new APIError(500, "Invalid access token")
    }
})