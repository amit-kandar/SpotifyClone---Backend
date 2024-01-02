import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { Artist } from "../models/artist.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { Track } from "../models/track.model";
import { APIResponse } from "../utils/APIResponse";
import mongoose, { Schema, Types } from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Like } from "../models/like.model";

// @route   POST /api/v1/tracks/add-track
// @desc    Add Track
// @access  [Artist, Admin]
export const addTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user
    const userId: mongoose.Types.ObjectId = req.user?.id;

    try {
        // check user exists or not
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // get artistId from Artist collection
        const artist = await Artist.findOne({ user: userId });
        if (!artist) throw new APIError(403, "Access denied. Insufficient permission.");

        const artistId = artist?._id;

        // get data from req.body
        const { title, genre, releaseDate, lyrics } = req.body;

        // validate data
        if ((!title || !genre || !releaseDate) && !lyrics) throw new APIError(400, "Some fields are missing");

        // get local cover image path
        // get local track path
        const { cover_image: [coverImageFile], track: [trackFile] } = req.files as { [fieldname: string]: Express.Multer.File[] };
        const coverImageLocalPath: string = coverImageFile.path;
        const trackLocalPath: string = trackFile.path;
        if (!coverImageLocalPath || !trackLocalPath) throw new APIError(400, "All file are required");

        // upload cover image to cloudinary
        const coverImageResponse: UploadApiResponse | string = await uploadToCloudinary(coverImageLocalPath);

        // validate upload response
        if (typeof coverImageResponse === 'string') throw new APIError(400, "Cover Image upload failed");
        const cover_image_url = coverImageResponse.url;
        const image_public_id = coverImageResponse.public_id;

        // upload song to cloudinary
        const trackResponse: UploadApiResponse | string = await uploadToCloudinary(trackLocalPath);

        // validate upload response
        if (typeof trackResponse === 'string' || !('duration' in trackResponse)) throw new APIError(400, "Track upload failed");
        const track_url = trackResponse.url;
        const track_public_id = trackResponse.public_id;
        const track_duration = trackResponse.duration;
        // res.json(trackResponse.duration)


        // save data in Track collection
        const track = await Track.create({
            title,
            genre,
            releaseDate,
            lyrics,
            user: userId,
            artist: artistId,
            duration: track_duration,
            cover_image: { url: cover_image_url, public_id: image_public_id },
            track: { url: track_url, public_id: track_public_id }
        })
        // check for track creation
        if (!track) throw new APIError(400, "Track add operation failed")

        // send the result to user
        res
            .status(201)
            .json(new APIResponse(
                201,
                track,
                `Track with id ${track._id} created successfully`

            ))
    } catch (error) {
        next(error);
    }
})

// @route   GET /api/v1/tracks/:artistId
// @desc    Get all tracks
// @access  Private
export const getAllTracks = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user.id
    const userId: mongoose.Types.ObjectId = req.user?.id;

    try {
        // check user exists or not
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // get artistId from params
        const artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.artistId);

        // verify artistId
        if (!artistId) throw new APIError(400, "Artist id is required");

        // get all track that's are created by this perticular artist
        const tracks = await Track.find({ artist: artistId });

        // validate response
        if (!tracks) throw new APIError(400, "Tracks not found");

        // send response to client
        res
            .status(200)
            .json(new APIResponse(
                200,
                { total: tracks.length, tracks },
                "All Tracks fetched Successfully"
            ))
    } catch (error) {
        next(error);
    }
})

// @route   GET /api/v1/tracks/:id
// @desc    Get specific track
// @access  Private
export const getTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user.id
    const userId: mongoose.Types.ObjectId = req.user?.id;

    try {
        // check user exists or not
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // get trackId from params
        const trackId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // validate trackId
        if (!trackId) throw new APIError(400, "Invalid track ID");

        // get track by using trackId
        const track = await Track.findById(trackId);

        // validate track
        if (!track) throw new APIError(400, "Track not found");

        // send track to client
        res
            .status(200)
            .json(new APIResponse(
                200,
                track,
                `Track with id: ${trackId} fetched successfully`
            ))
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/v1/tracks/:id
// @desc    Update track
// @access  [Admin, Artist]
export const updateTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user.id
    const userId: mongoose.Types.ObjectId = req.user?.id;
    try {
        // check user exists or not
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // get trackId from params
        const trackId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // validate trackId
        if (!trackId) throw new APIError(400, "Invalid track ID");

        // get data from req.body
        const { title, cover_image, lyrics } = req.body;

        // validate data
        if (!title && !cover_image && !lyrics) throw new APIError(400, "Atleast one field are required");

        // saved the new data to Track collection
        const track = await Track.findOneAndUpdate(
            { _id: trackId },
            { $set: { title, cover_image, lyrics } },
            { new: true }
        )

        // check for failure track update operation.
        if (!track) throw new APIError(400, "Track update operation failed!");

        // send the response to the client
        res
            .status(200)
            .json(new APIResponse(
                200,
                track,
                'Track updated Successfully'
            ))
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/v1/tracks/:id/remove
// @desc    Remove track
// @access  [Admin, Artist]
export const removeTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user
    const userId: mongoose.Types.ObjectId = req.user?.id;

    try {
        // validate userId
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // get trackId from req.params
        const trackId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // validate trackId
        if (!trackId) throw new APIError(400, "Invalid trackId");

        // get track by using trackId
        const track = await Track.findById(trackId);

        // validate track
        if (!track) throw new APIError(400, "Track Not found");

        // remove the track
        await Track.deleteOne(track._id);

        // extract public_id for cover_image and track
        const track_public_id = track.track.public_id;
        const cover_image_public_id = track.cover_image.public_id;

        // remove cloudinary files
        await cloudinary.uploader.destroy(track_public_id);
        await cloudinary.uploader.destroy(cover_image_public_id);

        // send response with 200
        res.status(200).json(new APIResponse(200, "Track removed successfully"));
    } catch (error) {
        next(error);
    }
})

// @route   POST /api/v1/tracks/:id/like
// @desc    Remove track
// @access  [Admin, Artist]
export const likeTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user
    const userId: mongoose.Types.ObjectId = req.user?.id;

    try {
        // validate user id
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // get trackId from params
        const trackId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // validate track id
        if (!trackId) {
            throw new APIError(400, "Invalid trackId");
        }

        // retrive like document if exists
        const like = await Like.findOne({ target_type: "Track", target_id: trackId, user: userId });

        // retrive track document by using trackId
        const track = await Track.findById(trackId);

        // validate track
        if (!track || track.totalLikes === undefined) throw new APIError(400, "Track should not be null");

        if (like) { // if already like that track then remove the document and remove 1 like from totalLikes
            await Like.deleteOne(like._id);
            track.totalLikes = track.totalLikes - 1;
        } else { // else create a new document and add 1 like into totalLikes
            await Like.create({
                user: userId,
                target_type: "Track",
                target_id: trackId,
            })
            track.totalLikes = track.totalLikes + 1;
        }

        // save the track
        await track.save({ validateBeforeSave: false });

        // retrive the new track
        const updatedTrack = await Track.findById(trackId);

        // send response back to client
        res.status(200).json(new APIResponse(
            200,
            { totalLikes: updatedTrack?.totalLikes }
        ));
    } catch (error) {
        next(error);
    }
});