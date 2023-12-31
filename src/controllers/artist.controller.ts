import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { Artist } from "../models/artist.model";
import { APIResponse } from "../utils/APIResponse";
import { User } from "../models/user.model";
import mongoose, { Schema } from "mongoose";
import { Follower } from "../models/follower.model";

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
    // get user id from req.user
    const userId = req.user?._id;

    try {
        // check for valid request
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // check user already a artist
        const isArtistExists = await Artist.findOne({ user: userId });
        if (isArtistExists) throw new APIError(400, "User has already a artist profile");

        // get genre and bio from req.body
        const { genre, bio } = req.body;
        if (!genre || !bio) throw new APIError(400, "All fields are required!");

        // validate genre
        if (!genres.includes(genre)) throw new APIError(400, "Invalid genre");

        // change the role in user
        const updateRole = await User.updateOne({ _id: userId }, { $set: { role: "artist", refreshToken: "" } });
        if (!updateRole) throw new APIError(400, "Failed the operation while update the role in database");

        // save into artists
        const artist = await Artist.create({
            user: userId,
            genre,
            bio
        });

        if (!artist) throw new APIError(400, "Failed while creating artist");

        res
            .status(201)
            .clearCookie("accessToken", { httpOnly: true, secure: true })
            .clearCookie("refreshToken", { httpOnly: true, secure: true })
            .json(new APIResponse(201, { artist }, "Artist profile created, Please signin again"));
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/v1/artists/:id
// @desc    Create artist profile
// @access  [artist, admin]
export const updateArtistProfile = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user
    const userId = req.user?._id;

    // get artist id from params and convert it into mongoose Object type
    let artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

    // get value from req.body(genres, bio)
    const { genre, bio } = req.body;

    try {
        // check for valid request
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // retrive artist by artistId
        const artist = await Artist.findById(artistId);

        // validate artist
        if (!artist) throw new APIError(404, "No such artist found");

        // check userid with artist user
        if (!artist.user === userId) throw new APIError(403, "You don't have permission to perform this action");

        // validate values
        if (!genre && !bio) throw new APIError(400, "Both fields are empty. Please provide at least one field");

        // save the value into database
        const updatedArtistDetails = await Artist.findOneAndUpdate(
            { _id: artistId },
            { $set: { bio: bio, genre: genre } },
            { new: true }
        );

        // check updatedUserDetails
        if (!updatedArtistDetails) {
            throw new APIError(404, 'Updated user details not found');
        }

        // send response
        res
            .status(200)
            .json(new APIResponse(
                200,
                { Artist: updatedArtistDetails },
                "Artist updated successfully"
            ));


    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/artsists/:id
// @desc    Get artist by id
// @access  Private
// have to check when userId and artist model user are not same
export const getArtistById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get user id from req.user.id
    const userId = req.user?.id;

    // get id from params

    const artistId = new mongoose.Types.ObjectId(req.params.id);

    try {
        // check for valid request
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // validate artist
        if (!artistId) throw new APIError(404, "No such artist found");
        // find artist by id
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
            {
                $unwind: {
                    path: "$creator"
                }
            },
            {
                $unwind: {
                    path: "$songs",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    "creator.password": 0,
                    "creator.refreshToken": 0,
                }
            }
        ]);

        // verify artist
        if (!artist || !artist[0]) throw new APIError(400, "artist Not found");

        // send response
        res
            .status(200)
            .json(new APIResponse(
                200,
                { Artist: artist[0] },
                "User details fetched successfully"
            ))
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/artists/
// @desc    Fetch All artists
// @access  Private
export const getALlArtists = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get user id from req.user.id
    const userId = req.user?.id;
    try {
        // check for valid request
        if (!userId) throw new APIError(401, "Invalid request, signin again");


        // retrive artist with user details
        const artists = await Artist.aggregate([
            {
                $lookup: {
                    from: "users", // Name of the user collection
                    localField: "user", // Field in the artist collection
                    foreignField: "_id", // Field in the user collection
                    as: "details" // Output array field containing user details
                }
            },
            {
                $project: {
                    _id: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0,
                    "details._id": 0,
                    "details.createdAt": 0,
                    "details.updatedAt": 0,
                    "details.__v": 0,
                    "details.password": 0,
                    "details.refreshToken": 0
                }
            }
        ]);

        // send response to user
        res
            .status(200)
            .json(new APIResponse(
                200,
                { Artists: artists },
                "Artists fetched successfully"
            ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/artists/:id/follow
// @desc    Follow specific artist by :id
// @access  Private
// may be need some changing on where artist id should provide(like, path variable, query, or body)
export const followArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userid from req.user.id
    const userId = req.user?.id;

    // get artist id from params
    const artistId = req.params.id;

    try {
        // check for valid request
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // validate artist
        if (!artistId) throw new APIError(404, "No such artist found");

        // create follow documment
        const response = await Follower.create({
            user: userId,
            artist: artistId
        });

        // validate response
        if (!response) throw new APIError(400, "Error while creating follow request");

        res
            .status(201)
            .json(new APIResponse(
                201,
                { Follower: response },
                "Follow request sent successfully"
            ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/artists/following-artists
// @desc Get all the artist whom a perticuler user following
// @access private
export const followingArtistByUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {

    // get userId from req.user.id
    const userId = new mongoose.Types.ObjectId(req.user?.id);

    try {
        // check for valid request
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // retrive all artist that the perticular user follow
        const allFollowingArtists = await Follower.aggregate([
            {
                $match: { user: userId }
            },
            {
                $lookup: {
                    from: "artists",
                    let: { artistId: "$artist" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$artistId"] }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                createdAt: 0,
                                updatedAt: 0,
                                __v: 0
                            }
                        }
                    ],
                    as: "Artist"
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { userId: "$user" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$_id", "$$userId"] }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                createdAt: 0,
                                updatedAt: 0,
                                __v: 0,
                                password: 0,
                                refreshToken: 0
                            }
                        }
                    ],
                    as: "Details"
                }
            },
            {
                $unwind: {
                    path: "$Artist",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $unwind: "$Details"
            },
            {
                $project: {
                    _id: 0,
                    user: 0,
                    artist: 0,
                    createdAt: 0,
                    updatedAt: 0,
                    __v: 0
                }
            }
        ]);

        // console.log(allFollowingArtists);


        // validate response
        if (!allFollowingArtists) throw new APIError(400, "Error while fetching following artists!");

        // send response to user
        res
            .status(200)
            .json(new APIResponse(
                200,
                { Following: allFollowingArtists },
                "Successfully fetched all followed artists"
            ))
    } catch (error) {
        console.log(error);

        next(error);
    }
});