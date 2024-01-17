import { NextFunction, Response, Request } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import mongoose from "mongoose";
import { History } from "../models/history.model";
import { APIResponse } from "../utils/APIResponse";

export const addToHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?._id;
        const target_id = new mongoose.Types.ObjectId(req.query.id || req.body.id) || 0;
        const target_type: string = req.query.type || req.body.type;

        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Sign In Again.");
        }

        if (!target_id || !target_type) {
            throw new APIError(400, "All Fields Are Required");
        }

        const response = await History.create({ target_id: target_id, target_type: target_type, user: userId });

        if (!response) {
            throw new APIError(400, "Failed To Add Data Into History");
        }

        res.status(201).json(new APIResponse(201, null, "Successfully Add Data To History"));

    } catch (error) {
        next(error);
    }
});

export const getHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Sign In Again.");
        }

        const response = await History.find({ user: userId });

        if (!response) {
            throw new APIError(400, "Failed To Fetch History");
        }

        res.status(200).json(new APIResponse(200, { total: response.length, history: response }));
    } catch (error) {
        next(error);
    }
});

export const clearHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Sign In Again.");
        }

        await History.deleteMany({ user: userId });

        res.status(200).json(new APIResponse(200, null, "Successfully Cleared History"));
    } catch (error) {
        next(error);
    }
});