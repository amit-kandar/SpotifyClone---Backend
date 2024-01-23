import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { APIError } from "../utils/APIError";
import { uploadToCloudinary } from "../utils/cloudinary";
import { Track } from "../models/track.model";
import { APIResponse } from "../utils/APIResponse";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { Like } from "../models/like.model";

// @route   POST /api/v1/tracks/
// @desc    Add Track
// @access  [Artist, Admin]
export const addTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        if (req.user?.role === 'regular') {
            throw new APIError(403, "Access Denied: Insufficient permission.");
        }

        const { title, genre, releaseDate, lyrics } = req.body;

        if ((!title || !genre || !releaseDate) && !lyrics) {
            throw new APIError(400, "Incomplete Data: Some fields are missing.");
        }

        const { cover_image: [coverImageFile], track: [trackFile] } = req.files as { [fieldname: string]: Express.Multer.File[] };
        const coverImageLocalPath: string = coverImageFile?.path;
        const trackLocalPath: string = trackFile?.path;

        if (!coverImageLocalPath || !trackLocalPath) {
            throw new APIError(400, "Missing Files: Both cover image and track are required.");
        }

        // Use Promise.all for parallel file uploads
        const [coverImageResponse, trackResponse] = await Promise.all([
            uploadToCloudinary(coverImageLocalPath, "tracks"),
            uploadToCloudinary(trackLocalPath, "tracks")
        ]);

        if (typeof coverImageResponse === 'string') {
            throw new APIError(400, "Cover Image Upload Failed.");
        }

        if (typeof trackResponse === 'string' || !('duration' in trackResponse)) {
            throw new APIError(400, "Track Upload Failed.");
        }

        const { url: cover_image_url, public_id: image_public_id } = coverImageResponse;
        const { url: track_url, public_id: track_public_id, duration: track_duration } = trackResponse;

        const track = await Track.create({
            title,
            genre,
            releaseDate,
            lyrics,
            artist: user_id,
            duration: track_duration,
            cover_image: { url: cover_image_url, public_id: image_public_id },
            track: { url: track_url, public_id: track_public_id }
        });

        if (!track) {
            throw new APIError(400, "Track Add Operation Failed.");
        }

        res.status(201).json(new APIResponse(
            201,
            track,
            `Track With ID ${track._id} Created Successfully.`
        ));
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/tracks/
// @desc    Get all tracks of a artist
// @access  [Regular, Admin, Artist]
export const getTracks = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        const artist_id = new mongoose.Types.ObjectId(req.body.artist_id);

        if (!artist_id) {
            throw new APIError(400, "Invalid Track Id: Artist id is required");
        }

        const tracks = await Track.find({ artist: artist_id }).lean();

        if (!tracks || tracks.length === 0) {
            throw new APIError(404, "No Tracks Found: No tracks created by this artist.");
        }

        res.status(200).json(new APIResponse(
            200,
            { total: tracks.length, tracks },
            `All Tracks With Artist ID: ${artist_id} Fetched Successfully.`
        ));
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/tracks/:id
// @desc    Get specific track
// @access  [Regular, Admin, Artist]
export const getTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        const track_id = new mongoose.Types.ObjectId(req.params.id || req.body.id);

        if (!track_id) {
            throw new APIError(400, "Invalid Track ID: Track ID is required.");
        }

        const track = await Track.findById(track_id).lean();

        if (!track) {
            throw new APIError(404, "Track Not Found: The requested track does not exist.");
        }

        res.status(200).json(new APIResponse(
            200,
            track,
            `Track With ID: ${track_id} Fetched Successfully.`
        ));
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/v1/tracks/:id
// @desc    Update track
// @access  [Admin, Artist]
export const updateTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        const track_id = new mongoose.Types.ObjectId(req.params.id || req.body.id);
        if (!mongoose.Types.ObjectId.isValid(track_id)) {
            throw new APIError(400, "Invalid Track ID: Track ID is required.");
        }

        const track = await Track.findById(track_id).lean();
        if (!track) {
            throw new APIError(404, "Track Not Found");
        }

        const { title, cover_image, lyrics } = req.body;

        if (!title && !cover_image && !lyrics) {
            throw new APIError(400, "Incomplete Data: At least one field is required.");
        }

        const updatedTrack = await Track.findOneAndUpdate(
            { _id: track_id },
            { $set: { title, cover_image, lyrics } },
            { new: true, select: 'title cover_image lyrics' }
        );

        if (!updatedTrack) {
            throw new APIError(400, "Track Update Failed: Unable to update the track.");
        }

        res.status(200).json(new APIResponse(
            200,
            updatedTrack,
            `Track With ID: ${track_id} Updated Successfully.`
        ));
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/v1/tracks/:id
// @desc    Delete track
// @access  [Admin, Artist]
export const deleteTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        const track_id = new mongoose.Types.ObjectId(req.params.id || req.body.id);

        if (!mongoose.Types.ObjectId.isValid(track_id)) {
            throw new APIError(400, "Invalid Track ID: Track ID is not valid.");
        }

        const track = await Track.findById(track_id);

        if (!track) {
            throw new APIError(404, "Track Not Found: The requested track does not exist.");
        }

        if (track.artist.toString() !== user_id.toString() && req.user?.role === 'regular') {
            throw new APIError(403, "Forbidden: You don't have permission to remove this track.");
        }

        const removeTrackResult = await Track.deleteOne({ _id: track._id });

        if (removeTrackResult.deletedCount !== 1) {
            throw new APIError(500, "Internal Server Error: Failed to remove the track.");
        }

        const track_public_id = track.track.public_id;
        const cover_image_public_id = track.cover_image.public_id;

        await cloudinary.uploader.destroy(track_public_id);
        await cloudinary.uploader.destroy(cover_image_public_id);

        res.status(200).json(new APIResponse(200, {}, `Track With ID: ${track_id} Deleted Successfully.`));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/tracks/:id/like
// @desc    Like or Unlike track
// @access  [Regular, Admin, Artist]
export const likeUnlikeTrack = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id: mongoose.Types.ObjectId = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized: Please sign in again.");
        }

        const trackId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(trackId)) {
            throw new APIError(400, "Invalid TrackId");
        }

        const track = await Track.findById(trackId);
        if (!track) {
            throw new APIError(404, "Track Doesn't Exists")
        }

        const like = await Like.findOne({ target_type: "Track", target_id: trackId, user: user_id });

        let message: string;

        if (like) { // if already like that track then remove the document and remove 1 like from totalLikes
            await Like.deleteOne(like._id);
            track.totalLikes -= 1;
            message = "Successfully Unlike The Track";
        } else { // else create a new document and add 1 like into totalLikes
            await Like.create({
                user: user_id,
                target_type: "Track",
                target_id: trackId,
            })
            track.totalLikes += 1;
            message = "Successfully Like The Track";
        }

        await track.save();

        const updatedTrack = await Track.findById(trackId);

        res.status(200).json(new APIResponse(
            200,
            { totalLikes: updatedTrack?.totalLikes },
            message
        ));
    } catch (error) {
        next(error);
    }
});