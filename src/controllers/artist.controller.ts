import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { Artist } from "../models/artist.model";
import { APIResponse } from "../utils/APIResponse";
import { User } from "../models/user.model";
import mongoose from "mongoose";
import redisClient from "../config/redis";
import { Like } from "../models/like.model";

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
export const createArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
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

            const artist_details = {
                ...req.user,
                artist_id: newArtist._id,
                role: updatedUser.role,
                genre: newArtist.genre,
                bio: newArtist.bio,
                total_likes: newArtist.total_likes
            }

            res
                .status(201)
                .clearCookie("accessToken", { httpOnly: true, secure: true })
                .clearCookie("refreshToken", { httpOnly: true, secure: true })
                .json(new APIResponse(201, { artist: artist_details }, "Artist Profile Created Successfully. Please Sign in Again."));
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
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(artist_id)) {
            throw new APIError(400, "Invalid Artist ID");
        }

        const artist = await Artist.findById(artist_id).lean();

        if (!artist) {
            throw new APIError(404, "The Requested Artist Does Not Exist.");
        }

        const isUserAuthorized = (artist.user)?.toString() === user_id.toString();
        if (!isUserAuthorized) {
            throw new APIError(403, "You Don't Have The Required Permissions To Perform This Action.");
        }

        if (!genre && !bio) {
            throw new APIError(400, "At Least One Field (genre or bio) Should Be Provided.");
        }

        const updatedArtistDetails = await Artist.findOneAndUpdate(
            { _id: artist_id },
            { $set: { genre: genre, bio: bio } },
            { new: true }
        ).lean();

        if (!updatedArtistDetails) {
            throw new APIError(404, 'Unable To Find Updated Artist Details.');
        }

        const user = req.user;
        if (genre) {
            user.genre = genre;
        }
        if (bio) {
            user.bio = bio;
        }

        await redisClient.set(`${user_id}`, JSON.stringify(user));

        res.status(200).json(new APIResponse(
            200,
            { artist: user },
            "Artist Updated Successfully."
        ));

    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/artsists/:id
// @desc    Get artist by id
// @access  [artist, admin, regular]
export const getArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const artist_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(artist_id)) {
            throw new APIError(400, "Invalid Artist ID");
        }

        const artist = await Artist.aggregate([
            {
                $match: { _id: artist_id }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $addFields: {
                    mergedObject: {
                        $mergeObjects: [
                            { $arrayElemAt: ["$userDetails", 0] },
                            "$$ROOT"
                        ]
                    }
                },
            },
            {
                $replaceRoot: { newRoot: "$mergedObject" }
            },
            {
                $project: {
                    "userDetails": 0,
                    "refreshToken": 0,
                    "password": 0
                }
            },
            {
                $project: {
                    _id: "$user",
                    artist_id: "$_id",
                    name: "$name",
                    username: "$username",
                    role: "$role",
                    email: "$email",
                    date_of_birth: "$date_of_birth",
                    genre: "$genre",
                    bio: "$bio",
                    total_likes: "$total_likes",
                    avatar: {
                        url: "$avatar.url",
                        public_id: "$avatar.public_id",
                        _id: "$avatar._id"
                    }
                }
            }
        ]);

        if (!artist || !artist.length) {
            throw new APIError(404, "Artist Not Found: No Artist Found With Provided ID.");
        }

        res.status(200).json(new APIResponse(
            200,
            { artist: artist[0] },
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
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        const artists = await Artist.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $addFields: {
                    mergedObject: {
                        $mergeObjects: [
                            { $arrayElemAt: ["$userDetails", 0] },
                            "$$ROOT"
                        ]
                    }
                },
            },
            {
                $replaceRoot: { newRoot: "$mergedObject" }
            },
            {
                $project: {
                    "userDetails": 0,
                    "refreshToken": 0,
                    "password": 0
                }
            },
            {
                $project: {
                    _id: "$user",
                    artist_id: "$_id",
                    name: "$name",
                    username: "$username",
                    role: "$role",
                    email: "$email",
                    date_of_birth: "$date_of_birth",
                    genre: "$genre",
                    bio: "$bio",
                    total_likes: "$total_likes",
                    avatar: {
                        url: "$avatar.url",
                        public_id: "$avatar.public_id",
                        _id: "$avatar._id"
                    }
                }
            }
        ]);

        if (!artists || !artists.length) {
            throw new APIError(404, "Artists Not Found: No Artists Found.");
        }

        res.status(200).json(new APIResponse(
            200,
            { total: artists.length, artists: artists },
            "Artists Fetched Successfully."
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/artists/:id/like
// @desc    Like or Unlike artist
// @access  [Admin, Artist, Regular]
export const likeUnlikeArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const artist_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(artist_id)) {
            throw new APIError(400, "Invalid Artist ID.");
        }

        const artist = await Artist.findById(artist_id);

        if (!artist) {
            throw new APIError(400, "Artist Doesn't Exists.");
        }

        const like = await Like.findOneAndDelete({ target_type: "Artist", target_id: artist_id, user: user_id });

        let message: string;

        if (like) {
            await Like.deleteOne(like._id);
            artist.total_likes -= 1;
            message = "Successfully Unlike The Artist";
        } else {
            await Like.create({
                user: user_id,
                target_type: "Artist",
                target_id: artist_id,
            });
            artist.total_likes += 1;
            message = "Successfully Like The Artist";
        }

        await artist.save();

        const updatedArtist = await Artist.findById(artist_id);

        res.status(200).json(new APIResponse(
            200,
            { total_likes: updatedArtist?.total_likes },
            message
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/artists/liked
// @desc    Get All Like Atist
// @access  [Admin, Artist, Regular]
export const likedArtists = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = new mongoose.Types.ObjectId(req.user?._id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        const artists = await Like.aggregate([
            { $match: { user: user_id, target_type: 'Artist' } },
            {
                $lookup: {
                    from: 'artists',
                    foreignField: '_id',
                    localField: 'target_id',
                    as: 'Artist'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    foreignField: '_id',
                    localField: 'user',
                    as: 'Details'
                }
            },
            { $unwind: '$Artist' },
            { $unwind: '$Details' },
            {
                $project: {
                    _id: "$Artist.user",
                    artist_id: "$Artist._id",
                    name: "$Details.name",
                    username: "$Details.username",
                    role: "$Details.role",
                    email: "$Details.email",
                    date_of_birth: "$Details.date_of_birth",
                    genre: "$Artist.genre",
                    bio: "$Artist.bio",
                    totalLikes: "$Artist.totalLikes",
                    avatar: {
                        url: "$Details.avatar.url",
                        public_id: "$Details.avatar.public_id",
                        _id: "$Details.avatar._id"
                    }
                }
            }
        ]);

        if (!artists) {
            throw new APIError(400, "Failed To Fetch The Liked Albums.");
        }

        res.status(200).json(new APIResponse(200, { total: artists.length, artists }, "Successfully Fetched All The Liked ALbums"));
    } catch (error) {
        next(error);
    }
});