import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { Artist } from "../models/artist.model";
import { APIResponse } from "../utils/APIResponse";
import { User } from "../models/user.model";
import mongoose, { Schema } from "mongoose";

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