import { NextFunction, Response, Request } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import mongoose from "mongoose";
import { History } from "../models/history.model";
import { APIResponse } from "../utils/APIResponse";

export const addToHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const target_id = new mongoose.Types.ObjectId(req.query.id || req.body.id) || 0;
        const target_type: string = req.query.type || req.body.type;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!target_id || !target_type) {
            throw new APIError(400, "All Fields Are Required");
        }

        const response = await History.create({ target_id: target_id, target_type: target_type, user: user_id });

        if (!response) {
            throw new APIError(400, "Failed To Add Data Into History");
        }

        res.status(201).json(new APIResponse(201, {}, "Successfully Add Data To History"));

    } catch (error) {
        next(error);
    }
});

export const getHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        const history = await History.find({ user: user_id }).lean();

        if (!history) {
            throw new APIError(400, "Failed To Fetch History");
        }

        res.status(200).json(new APIResponse(200, { total: history.length, history: history }, "Successfully Fetched The Histories."));
    } catch (error) {
        next(error);
    }
});

export const clearHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        await History.deleteMany({ user: user_id });

        res.status(200).json(new APIResponse(200, {}, "Successfully Cleared History"));
    } catch (error) {
        next(error);
    }
});