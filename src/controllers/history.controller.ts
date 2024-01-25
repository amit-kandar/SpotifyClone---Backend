import { NextFunction, Response, Request } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import mongoose from "mongoose";
import { History } from "../models/history.model";
import { APIResponse } from "../utils/APIResponse";
import { Track } from "../models/track.model";

// @route   POST /api/v1/history/
// @desc    Add Data To History
// @access  [Admin, Artist, Regular]
export const addToHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const track_id = new mongoose.Types.ObjectId(req.body.track_id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(track_id)) {
            throw new APIError(400, "Invalid Track ID");
        }

        const track = await Track.findById({ _id: track_id }).lean();
        if (!track) {
            throw new APIError(400, "Failed To Retrive The Track");
        }

        const history = await History.create({ track_id: track_id, user: user_id });
        if (!history) {
            throw new APIError(400, "Failed To Add Data Into History");
        }

        res.status(201).json(new APIResponse(201, { history }, "Successfully Add Data To History"));

    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/history/
// @desc    Get All History
// @access  [Admin, Artist, Regular]
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

// @route   GET /api/v1/history/:id
// @desc    Clear One History
// @access  [Admin, Artist, Regular]
export const deleteOneHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const history_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(history_id)) {
            throw new APIError(401, "Invalid History ID");
        }

        const history = await History.findById(history_id).lean();
        if (!history) {
            throw new APIError(400, "Failed To Retrive The History.");
        }

        await History.deleteOne(history_id);

        res.status(200).json(new APIResponse(200, {}, "Successfully Deleted History"));
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/history/clear-all
// @desc    Clear All Histories
// @access  [Admin, Artist, Regular]
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