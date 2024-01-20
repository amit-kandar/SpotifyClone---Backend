import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { Artist } from "../models/artist.model";
import { APIResponse } from "../utils/APIResponse";
import { User } from "../models/user.model";
import mongoose from "mongoose";

const genres = [
    "rock",
    "pop",
    "rap",
    "jazz",
    "blues",
];

// @route   POST /api/v1/artists/
// @desc    Create artist profile
// @access  [regular, admin]
export const createArtistProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        let { genre, bio } = req.body;

        if (!genre || !bio) {
            throw new APIError(400, "Genre And Bio Fields Are Required For Creating An Artist Profile.");
        }

        genre = genre.toLowerCase();
        bio = bio.toLowerCase();

        if (!genres.includes(genre)) {
            throw new APIError(400, "Invalid Genre. Please Provide A Valid Genre.");
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const updatedUser = await User.findOneAndUpdate(
                { _id: user_id },
                { $set: { role: "artist", refreshToken: "" } },
                { session, new: true }
            );

            if (!updatedUser) {
                await session.abortTransaction();
                session.endSession();
                throw new APIError(400, "Failed To Update The User Role. Please Try Again.");
            }

            const newArtist = await Artist.findOneAndUpdate(
                { user: user_id },
                { user: user_id, genre, bio },
                { session, upsert: true, new: true }
            );

            if (!newArtist) {
                await session.abortTransaction();
                session.endSession();
                throw new APIError(400, "Failed To Create The Artist Profile. Please Try Again.");
            }

            await session.commitTransaction();
            session.endSession();

            res
                .status(201)
                .clearCookie("accessToken", { httpOnly: true, secure: true })
                .clearCookie("refreshToken", { httpOnly: true, secure: true })
                .json(new APIResponse(201, { artist: newArtist }, "Artist Profile Created Successfully. Please Sign in Again."));
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            next(error);
        }
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/v1/artists/:id
// @desc    Update artist profile
// @access  [artist, admin]
export const updateArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const artist_id = new mongoose.Types.ObjectId(req.params.id);

        const { genre, bio } = req.body;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }
        if (!mongoose.Types.ObjectId.isValid(artist_id)) {
            throw new APIError(400, "Invalid Artist ID");
        }

        const artist = await Artist.findById(artist_id).lean();

        if (!artist) {
            throw new APIError(404, "Artist Not Found: The Requested Artist Does Not Exist.");
        }

        const isUserAuthorized = (artist.user)?.toString() === user_id.toString();
        if (!isUserAuthorized) {
            throw new APIError(403, "Permission Denied: You Don't Have The Required Permissions To Perform This Action.");
        }

        if (!genre && !bio) {
            throw new APIError(400, "Validation Error: At Least One Field (genre or bio) Should Be Provided.");
        }

        const updateFields: Record<string, any> = {};
        if (genre) {
            updateFields.genre = genre;
        }
        if (bio) {
            updateFields.bio = bio;
        }

        const updatedArtistDetails = await Artist.findOneAndUpdate(
            { _id: artist_id },
            { $set: updateFields },
            { new: true }
        ).lean();

        if (!updatedArtistDetails) {
            throw new APIError(404, 'Update Failed: Unable To Find Updated Artist Details.');
        }

        res.status(200).json(new APIResponse(
            200,
            { Artist: updatedArtistDetails },
            "Artist Updated Successfully."
        ));

    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/artsists/:id
// @desc    Get artist by id
// @access  [artist, admin, regular]
// have to check when user_id and artist model user are not same
export const getArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        const artist_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        if (!mongoose.Types.ObjectId.isValid(artist_id)) {
            throw new APIError(404, "Artist Not Found: No Artist ID Provided.");
        }

        const artist = await Artist.aggregate([
            { $match: { _id: artist_id } },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "creator"
                }
            },
            {
                $lookup: {
                    from: "songs",
                    localField: "_id",
                    foreignField: "artist",
                    as: "songs"
                }
            },
            { $unwind: { path: "$creator" } },
            { $unwind: { path: "$songs", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    "creator.password": 0,
                    "creator.refreshToken": 0,
                }
            }
        ]);

        if (!artist || !artist.length) {
            throw new APIError(404, "Artist Not Found: No Artist Found With Provided ID.");
        }

        res.status(200).json(new APIResponse(
            200,
            { Artist: artist[0] },
            "Artist Details Fetched Successfully."
        ));
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/artists/
// @desc    Fetch All artists
// @access  [artist, admin, regular]
export const getArtists = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        const artists = await Artist.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "details"
                }
            },
            {
                $project: {
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0,
                    "details.createdAt": 0,
                    "details.updatedAt": 0,
                    "details.__v": 0,
                    "details.password": 0,
                    "details.refreshToken": 0
                }
            }
        ]);

        if (!artists || !artists.length) {
            throw new APIError(404, "Artists Not Found: No Artists Found.");
        }

        res.status(200).json(new APIResponse(
            200,
            { Artists: artists },
            "Artists Fetched Successfully."
        ));
    } catch (error) {
        next(error);
    }
});