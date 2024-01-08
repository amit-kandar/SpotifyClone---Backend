import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { Artist } from "../models/artist.model";
import { APIResponse } from "../utils/APIResponse";
import { User } from "../models/user.model";
import mongoose, { Schema } from "mongoose";
import { Follower } from "../models/follower.model";
import { Like } from "../models/like.model";
import logger from "../config/logger";

const genres = [
    "rock",
    "pop",
    "rap",
    "jazz",
    "blues",
];


// @route   POST /api/v1/artists/create
// @desc    Create artist profile
// @access  [regular, admin]
export const createArtistProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            throw new APIError(401, "Unauthorized. Please Sign in Again");
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
                { _id: userId },
                { $set: { role: "artist", refreshToken: "" } },
                { session, new: true }
            );

            if (!updatedUser) {
                await session.abortTransaction();
                session.endSession();
                throw new APIError(400, "Failed To Update The User Role. Please Try Again.");
            }

            const newArtist = await Artist.findOneAndUpdate(
                { user: userId },
                { user: userId, genre, bio },
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
            throw error;
        }
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/v1/artists/:id
// @desc    Create artist profile
// @access  [artist, admin]
export const updateArtistProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?._id;
    const artistId = new mongoose.Types.ObjectId(req.params.id);

    const { genre, bio } = req.body;

    try {
        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Signin To Proceed.");
        }

        const artist = await Artist.findById(artistId).lean();

        if (!artist) {
            throw new APIError(404, "Artist Not Found: The Requested Artist Does Not Exist.");
        }

        const isUserAuthorized = (artist.user)?.toString() === userId.toString();
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
            { _id: artistId },
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
// have to check when userId and artist model user are not same
export const getArtistById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get user ID from req.user
    const userId = req.user?._id;

    // Get artist ID from params
    const artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

    try {
        // Check for valid request
        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Signin To Proceed.");
        }

        // Validate artist ID
        if (!artistId) {
            throw new APIError(404, "Artist Not Found: No Artist ID Provided.");
        }

        // Find artist by ID with aggregate query
        const artist = await Artist.aggregate([
            { $match: { _id: artistId } },
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

        // Verify if the artist exists
        if (!artist || !artist.length) {
            throw new APIError(404, "Artist Not Found: No Artist Found With Provided ID.");
        }

        // Send response with artist details
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
export const getAllArtists = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?._id;

        // Check for valid request
        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Signin To Proceed.");
        }

        // Retrieve artists with user details using aggregation
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

        // Check if artists were fetched
        if (!artists || !artists.length) {
            throw new APIError(404, "Artists Not Found: No Artists Found.");
        }

        // Send response to user with artists' details
        res.status(200).json(new APIResponse(
            200,
            { Artists: artists },
            "Artists Fetched Successfully."
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/artists/:id/follow
// @desc    Follow specific artist by :id
// @access  [admin, artist, regular]
export const followArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.user?._id;
    const artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

    try {
        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Sign in To Proceed.");
        }

        if (!artistId) {
            throw new APIError(404, "Artist Not Found: No Artist ID Provided.");
        }

        const followQuery = { user: userId, artist: artistId };
        const isFollowed = await Follower.findOneAndDelete(followQuery).lean();

        const isUnfollowed = !!isFollowed;

        if (!isUnfollowed) {
            await Follower.create(followQuery);
        }

        const message = isUnfollowed ? "Unfollowed successfully." : "Follow Request Sent Successfully.";

        res.status(isUnfollowed ? 200 : 201).json(new APIResponse(
            isUnfollowed ? 200 : 201, isUnfollowed ? { isFollow: false } : { isFollow: true },
            message
        ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/artists/following-artists
// @desc Get all the artist whom a perticuler user following
// @access [admin, artist, regular]
export const followingArtistByUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Get userId from req.user
        const userId = req.user?._id;

        // Check if userId is valid
        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Signin Again.");
        }

        // Retrieve all artists that the particular user follows
        const allFollowingArtists = await Follower.aggregate([
            { $match: { user: userId } },
            {
                $lookup: {
                    from: "artists",
                    let: { artistId: "$artist" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$artistId"] } } },
                        { $project: { __v: 0 } }
                    ],
                    as: "Artist"
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { userId: "$user" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$userId"] } } },
                        { $project: { password: 0, refreshToken: 0, public_id: 0, email: 0, __v: 0, role: 0 } }
                    ],
                    as: "Details"
                }
            },
            { $unwind: { path: "$Artist", preserveNullAndEmptyArrays: true } },
            { $unwind: "$Details" },
            { $project: { __v: 0 } }
        ]);

        // Check if any artists are found
        if (!allFollowingArtists || allFollowingArtists.length === 0) {
            throw new APIError(404, "No Followed Artists Found For The User.");
        }

        const total = allFollowingArtists.length;

        // Send response to user
        res.status(200).json(new APIResponse(
            200,
            { total, Following: allFollowingArtists },
            "Successfully Fetched All Followed Artists."
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/artists/:id/like
// @desc    Like artist
// @access  [Admin, Artist, Regular]
export const likeArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Get userId from req.user
        const userId = req.user?.id;

        // Validate user ID
        if (!userId) {
            throw new APIError(401, "Unauthorized: Please Sign In Again.");
        }

        // Get artistId from params
        const artistId = req.params.id;

        // Validate artist ID
        if (!artistId || !mongoose.Types.ObjectId.isValid(artistId)) {
            throw new APIError(400, "Invalid Artist ID.");
        }

        // Retrieve like document if it exists
        const like = await Like.findOneAndDelete({ target_type: "Artist", target_id: artistId, user: userId });

        // Retrieve artist document by artistId
        const artist = await Artist.findById(artistId);

        // Validate artist existence and totalLikes property
        if (!artist || artist.totalLikes === undefined) {
            throw new APIError(400, "Artist Doesn't Exist.");
        }

        // Logic for like/unlike action
        if (like) {
            artist.totalLikes -= 1;
        } else {
            await Like.create({
                user: userId,
                target_type: "Artist",
                target_id: artistId,
            });
            artist.totalLikes += 1;
        }

        // Save the updated artist
        await artist.save();

        // Send response back to client
        res.status(200).json(new APIResponse(
            200,
            { totalLikes: artist.totalLikes },
            "Like Action Performed Successfully."
        ));
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/artists/:id/followers-list
// @desc    Get total followers
// @access  [Admin, Artist]
export const getTotalFollowers = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Retrieve the artist ID from request parameters
        const artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate artist ID
        if (!artistId || !mongoose.Types.ObjectId.isValid(artistId)) {
            throw new APIError(400, 'Invalid Artist ID.');
        }

        // Find all followers for the specified artist
        const followers = await Follower.find({ artist: artistId });

        if (!followers)
            throw new APIError(404, 'No Followers Found For The Secified Artist.');

        // Get total number of followers
        const totalFollowers = followers.length;

        // Send response with the total number of followers
        res.status(200).json(new APIResponse(200, { totalFollowers }, "Successfully Fetched Total Followers."));
    } catch (error) {
        next(error);
    }
});