import { Response, Request, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import { APIError } from "../utils/APIError";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { APIResponse } from "../utils/APIResponse";
import { Like } from "../models/like.model";
import { Playlist } from "../models/playlist.model";

// @route POST /api/v1/playlists/create
// @desc Create new playlist
// @access [Artist, Admin, Regular]
export const createPlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Retrieve the user ID from req.user
        const userId: mongoose.Types.ObjectId = req.user?.id;

        // Validate user ID
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // Get data from req.body
        const { name } = req.body;

        // Validate required data
        if (!name) {
            throw new APIError(400, "Name is required to create a playlist");
        }

        // get image local path
        let cover_image_local_path: string | undefined;

        if (!req.file?.path) {
            cover_image_local_path = "public/assets/default.jpg";
        } else {
            cover_image_local_path = req.file.path;
        }

        const cover_image_response: UploadApiResponse | string = await uploadToCloudinary(cover_image_local_path, "playlists");
        if (typeof cover_image_response !== 'object' && !cover_image_response.hasOwnProperty('url')) {
            throw new APIError(400, "Invalid cover_image_response data");
        }
        const cover_image_url = (cover_image_response as UploadApiResponse).url;
        const public_id = (cover_image_response as UploadApiResponse).public_id;

        // Create a new playlist
        const playlist = await Playlist.create({
            name,
            cover_image: {
                url: cover_image_url,
                public_id
            },
            user: userId
        });

        // Send response with the created playlist
        res.status(201).json(new APIResponse(
            201,
            playlist,
            "Playlist created successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route PUT /api/v1/playlists/:id/add-track
// @desc Add song to playlist
// @access [Artist, Admin, Regular]
export const addTrackToPlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Retrieve the user ID from req.user
        const userId: mongoose.Types.ObjectId = req.user?.id;

        // Validate user ID
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // Get playlist ID from request parameters
        const playlistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate playlist ID
        if (!playlistId) {
            throw new APIError(400, "Invalid playlist ID");
        }

        // Get the playlist by ID
        const playlist = await Playlist.findById(playlistId);

        // Check if the playlist exists
        if (!playlist) {
            throw new APIError(404, "Playlist not found");
        }

        // Check if the current user is authorized to modify this playlist
        if (playlist.user.toString() !== userId.toString()) {
            throw new APIError(403, "You don't have permission to modify this playlist");
        }

        // Get the track ID to add to the playlist from request body
        const { trackId } = req.body;

        // Validate track ID
        if (!trackId) {
            throw new APIError(400, "Track ID is required");
        }

        // Check if the track already exists in the playlist
        if (playlist.track.includes(trackId)) {
            throw new APIError(400, "Track already exists in the playlist");
        }

        // Add the track to the playlist
        playlist.track.push(trackId);
        await playlist.save();

        // Send response with updated playlist
        res.status(200).json(new APIResponse(
            200,
            playlist,
            "Track added to playlist successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route PUT /api/v1/playlists/:id
// @desc Update playlist
// @access [Artist, Admin, Regular]
export const updatePlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Retrieve the user ID from req.user
        const userId: mongoose.Types.ObjectId = req.user?.id;

        // Validate user ID
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // Get playlist ID from request parameters
        const playlistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate playlist ID
        if (!playlistId) {
            throw new APIError(400, "Invalid playlist ID");
        }

        // Find the playlist by ID
        const playlist = await Playlist.findById(playlistId);

        // Check if the playlist exists
        if (!playlist) {
            throw new APIError(404, "Playlist not found");
        }

        // Check if the current user is authorized to modify this playlist
        if (playlist.user.toString() !== userId.toString()) {
            throw new APIError(403, "You don't have permission to modify this playlist");
        }

        // Get updated details from request body
        const { name } = req.body;

        // Validate and update playlist name
        if (name) {
            playlist.name = name;
        }

        // Check if a new cover image is uploaded
        if (req.file?.path) {
            const cover_image_local_path: string = req.file.path;
            const cover_image_response: UploadApiResponse | string = await uploadToCloudinary(cover_image_local_path, "playlists");

            if (typeof cover_image_response === 'object' && cover_image_response.hasOwnProperty('url')) {
                const cover_image_url = (cover_image_response as UploadApiResponse).url;
                const public_id = (cover_image_response as UploadApiResponse).public_id;
                playlist.cover_image.url = cover_image_url;
                playlist.cover_image.public_id = public_id;
            } else {
                throw new APIError(400, "Invalid cover image data");
            }
        }

        // Save the updated playlist
        await playlist.save();

        // Send response with updated playlist
        res.status(200).json(new APIResponse(
            200,
            playlist,
            "Playlist updated successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/playlists/:id
// @desc Get a specific playlist by ID
// @access [Artist, Admin, Regular]
export const getPlaylistById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Retrieve the playlist ID from request parameters
        const playlistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate playlist ID
        if (!playlistId) {
            throw new APIError(400, "Invalid playlist ID");
        }

        // Find the playlist by ID
        const playlist = await Playlist.findById(playlistId);

        // Check if the playlist exists
        if (!playlist) {
            throw new APIError(404, "Playlist not found");
        }

        // Send response with the found playlist
        res.status(200).json(new APIResponse(
            200,
            playlist,
            "Playlist retrieved successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/playlists/:userId
// @desc Get all playlists of a particular user
// @access [Artist, Admin, Regular]
export const getAllPlaylistByUserId = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Retrieve the user ID from req.user
        const userId: mongoose.Types.ObjectId = req.user?.id;

        // Validate user ID
        if (!userId) {
            throw new APIError(400, "Invalid user ID");
        }

        // Find all playlists belonging to the user
        const playlists = await Playlist.find({ user: userId });

        // Send response with playlists belonging to the user
        res.status(200).json(new APIResponse(
            200,
            playlists,
            "All playlists retrieved successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route DELETE /api/v1/playlists/:id/remove-track
// @desc Remove track from playlist
// @access [Artist, Admin, Regular]
export const removeTrackFromPlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Retrieve the user ID from req.user
        const userId: mongoose.Types.ObjectId = req.user?.id;

        // Validate user ID
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // Get playlist ID from request parameters
        const playlistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate playlist ID
        if (!playlistId) {
            throw new APIError(400, "Invalid playlist ID");
        }

        // Get the track ID to be removed from the request body
        const { trackId } = req.body;

        // Validate track ID
        if (!trackId) {
            throw new APIError(400, "Track ID is required");
        }

        // Update the playlist by removing the track
        const updatedPlaylist = await Playlist.updateOne(
            { _id: playlistId, user: userId },
            { $pull: { track: trackId } }
        );

        // Check if the update was successful
        if (!updatedPlaylist) {
            throw new APIError(404, "Track not found in the playlist or permission denied");
        }

        // Send success response
        res.status(200).json(new APIResponse(
            200,
            {},
            "Track removed from the playlist successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route DELETE /api/v1/playlists/:id/remove
// @desc Remove specific playlist
// @access [Artist, Admin, Regular]
export const removePlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Retrieve the user ID from req.user
        const userId: mongoose.Types.ObjectId = req.user?.id;

        // Validate user ID
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // Get playlist ID from request parameters
        const playlistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate playlist ID
        if (!playlistId) {
            throw new APIError(400, "Invalid playlist ID");
        }

        // Find the playlist by ID and user ID
        const playlist = await Playlist.findOneAndDelete({ _id: playlistId, user: userId });

        // Check if the playlist was found and deleted
        if (!playlist) {
            throw new APIError(404, "Playlist not found or permission denied");
        }

        // Send success response
        res.status(200).json(new APIResponse(
            200,
            {},
            "Playlist removed successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/playlists/:id/like
// @desc    Like playlist
// @access  [Admin, Artist, Regular]
export const likePlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user
    const userId: mongoose.Types.ObjectId = req.user?.id;

    try {
        // validate user id
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // get playlistId from params
        const playlistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // validate playlist id
        if (!playlistId) {
            throw new APIError(400, "Invalid playlistId");
        }

        // retrive like document if exists
        const like = await Like.findOne({ target_type: "Playlist", target_id: playlistId, user: userId });

        // retrive playlist document by using playlistId
        const playlist = await Playlist.findById(playlistId);

        // validate playlist
        if (!playlist || playlist.totalLikes === undefined) throw new APIError(400, "playlist should not be null");

        if (like) { // if already like that playlist then remove the document and remove 1 like from totalLikes
            await Like.deleteOne(like._id);
            playlist.totalLikes = playlist.totalLikes - 1;
        } else { // else create a new document and add 1 like into totalLikes
            await Like.create({
                user: userId,
                target_type: "Playlist",
                target_id: playlist,
            })
            playlist.totalLikes = playlist.totalLikes + 1;
        }

        // save the Playlist
        await playlist.save({ validateBeforeSave: false });

        // retrive the new playlist
        const updatedPlaylist = await Playlist.findById(playlistId);

        // send response back to client
        res.status(200).json(new APIResponse(
            200,
            { totalLikes: updatedPlaylist?.totalLikes }
        ));
    } catch (error) {
        next(error);
    }
});
