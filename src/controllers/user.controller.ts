import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";

export const signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
        message: "OK"
    })
})