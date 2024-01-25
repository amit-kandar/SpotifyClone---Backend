import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { Follower } from "../models/follower.model";
import { APIError } from "../utils/APIError";
import { APIResponse } from "../utils/APIResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { Artist } from "../models/artist.model";

// @route   POST /api/v1/follow/
// @desc    Follow specific artist by :id
// @access  [admin, artist, regular]
export const followArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const artist_id = new mongoose.Types.ObjectId(req.body.artist_id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(artist_id)) {
            throw new APIError(400, "Invallid Artist Id");
        }

        const artist = await Artist.find({ user: artist_id }).lean();
        if (!artist) {
            throw new APIError(404, "Artist Not Found")
        }

        const followQuery = { user: user_id, artist: artist_id };
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

// @route GET /api/v1/follow/following
// @desc Get all the artist whom a perticuler user following
// @access [admin, artist, regular]
export const followingArtistByUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = new mongoose.Types.ObjectId(req.user?._id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        const allFollowingArtists = await Follower.aggregate([
            { $match: { user: user_id } },
            {
                $lookup: {
                    from: "users",
                    let: { user_id: "$user" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
                        { $project: { password: 0, refreshToken: 0, public_id: 0, email: 0, __v: 0, role: 0 } }
                    ],
                    as: "Details"
                }
            },
            {
                $lookup: {
                    from: "artists",
                    let: { user_id: "$artist" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$user", "$$user_id"] } } },
                        { $project: { __v: 0 } }
                    ],
                    as: "Artist"
                }
            },
            { $unwind: { path: "$Artist", preserveNullAndEmptyArrays: true } },
            { $unwind: "$Details" },
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

        if (!allFollowingArtists) {
            throw new APIError(404, "Failed To Retrive The Following Artists.");
        }

        res.status(200).json(new APIResponse(
            200,
            { total: allFollowingArtists.length, following: allFollowingArtists },
            "Successfully Fetched All Followed Artists."
        ));
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/follow/:artist_id
// @desc    Get total followers
// @access  [Admin, Artist]
export const getTotalFollowers = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = new mongoose.Types.ObjectId(req.user?._id);
        const artist_id = new mongoose.Types.ObjectId(req.params.artist_id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }


        if (!artist_id || !mongoose.Types.ObjectId.isValid(artist_id)) {
            throw new APIError(400, 'Invalid Artist ID.');
        }

        const followers = await Follower.find({ artist: artist_id }).lean();

        if (!followers)
            throw new APIError(404, 'Failed To Retrive Followers');

        const totalFollowers = followers.length;

        res.status(200).json(new APIResponse(200, { total_followers: totalFollowers }, "Successfully Fetched Total Followers."));
    } catch (error) {
        next(error);
    }
});