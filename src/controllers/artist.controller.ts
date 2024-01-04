import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { Artist } from "../models/artist.model";
import { APIResponse } from "../utils/APIResponse";
import { User } from "../models/user.model";
import mongoose, { Schema } from "mongoose";
import { Follower } from "../models/follower.model";
import { Like } from "../models/like.model";

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
    const userId: mongoose.Types.ObjectId = req.user?._id;

    try {
        // check for valid request
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // check user already a artist
        const isArtistExists = await Artist.findOne({ user: userId });
        if (isArtistExists) throw new APIError(400, "User has already a artist profile");

        // get genre and bio from req.body
        let { genre, bio } = req.body;
        if (!genre || !bio) throw new APIError(400, "All fields are required!");

        genre = genre.toLowerCase();
        bio = bio.toLowerCase();

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
    const userId: mongoose.Types.ObjectId = req.user?._id;

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
        if ((artist.user).toString() !== userId.toString()) throw new APIError(403, "You don't have permission to perform this action");

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
// @access  [artist, admin, regular]
// have to check when userId and artist model user are not same
export const getArtistById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get user id from req.user
    const userId: mongoose.Types.ObjectId = req.user?._id;

    // get id from params

    const artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

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
// @access  [artist, admin, regular]
export const getAllArtists = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get user id from req.user._id
    const userId: mongoose.Types.ObjectId = req.user?._id;

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
// @access  [admin, artist, regular]
// may be need some changing on where artist id should provide(like, path variable, query, or body)
export const followArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userid from req.user
    const userId: mongoose.Types.ObjectId = req.user?._id;

    // get artist id from params
    const artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

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
// @access [admin, artist, regular]
export const followingArtistByUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Get userId from req.user
        const userId: mongoose.Types.ObjectId = req.user?._id;

        // Check if userId is valid
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // Retrieve all artists that the particular user follows
        const allFollowingArtists = await Follower.aggregate([
            {
                $match: { user: userId }
            },
            // Aggregation pipeline to retrieve artist details
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
                                __v: 0
                            }
                        }
                    ],
                    as: "Artist"
                }
            },
            // Aggregation pipeline to retrieve user details
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
                                password: 0,
                                refreshToken: 0,
                                public_id: 0,
                                email: 0,
                                __v: 0,
                                role: 0
                            }
                        }
                    ],
                    as: "Details"
                }
            },
            // Unwind the arrays
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
                    __v: 0
                }
            }
        ]);

        // Check if any artists are found
        if (!allFollowingArtists || allFollowingArtists.length === 0) {
            throw new APIError(404, "No followed artists found");
        }

        const total = allFollowingArtists.length;

        // Send response to user
        res.status(200).json(new APIResponse(
            200,
            { total: total, Following: allFollowingArtists },
            "Successfully fetched all followed artists"
        ));
    } catch (error) {
        next(error);
    }
});


// @route   POST /api/v1/artists/:id/like
// @desc    Like artist
// @access  [Admin, Artist, Regular]
export const likeArtist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user
    const userId: mongoose.Types.ObjectId = req.user?.id;

    try {
        // validate user id
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // get artistId from params
        const artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // validate artist id
        if (!artistId) {
            throw new APIError(400, "Invalid artistId");
        }

        // retrive like document if exists
        const like = await Like.findOne({ target_type: "Artist", target_id: artistId, user: userId });

        // retrive artist document by using artistId
        const artist = await Artist.findById(artistId);

        // validate artist
        if (!artist || artist.totalLikes === undefined) throw new APIError(400, "Artist should not be null");

        if (like) { // if already like that artist then remove the document and remove 1 like from totalLikes
            await Like.deleteOne(like._id);
            artist.totalLikes = artist.totalLikes - 1;
        } else { // else create a new document and add 1 like into totalLikes
            await Like.create({
                user: userId,
                target_type: "Artist",
                target_id: artistId,
            })
            artist.totalLikes = artist.totalLikes + 1;
        }

        // save the artist
        await artist.save({ validateBeforeSave: false });

        // retrive the new artist
        const updatedArtist = await Artist.findById(artistId);

        // send response back to client
        res.status(200).json(new APIResponse(
            200,
            { totalLikes: updatedArtist?.totalLikes }
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
        if (!artistId) {
            throw new APIError(400, 'Invalid artistId');
        }

        // Find all followers for the specified artist
        const followers = await Follower.find({ artist: artistId });

        // Get total number of followers
        const totalFollowers = followers.length;

        // Send response with the total number of followers
        res.status(200).json(new APIResponse(200, { totalFollowers: totalFollowers }, "Successfully fetched total followers"))
    } catch (error) {
        next(error);
    }
});