import { Response, Request, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import { APIError } from "../utils/APIError";
import { Artist } from "../models/artist.model";
import { Album } from "../models/album.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { APIResponse } from "../utils/APIResponse";
import { Like } from "../models/like.model";
import { Track } from "../models/track.model";
import logger from '../config/logger';

// @route POST /api/v1/albums/create
// @desc Create new album
// @access [Artist, Admin]
export const createAlbum = asyncHandler(async (req, res, next) => {
    try {
        // userId from req.user
        const userId = req.user?.id;

        // Log user ID
        logger.info(`User ID: ${userId}`);

        // Check if the user exists
        if (!userId) throw new APIError(401, "Invalid request, sign in again");

        // Get data from req.body
        const { name, description } = req.body;

        // Validate data
        if (!name || !description)
            throw new APIError(422, "All fields are required!");

        // Get artistId from Artist collection
        const artist = await Artist.findOne({ user: userId }).select("_id");

        // Log artist information
        logger.info(`Artist: ${artist}`);

        // Verify artistId
        if (!artist) throw new APIError(404, "No such artist found");

        // Get image local path
        let cover_image_local_path = req.file?.path || "public/assets/default.jpg";

        // Log cover image local path
        logger.info(`Cover Image Local Path: ${cover_image_local_path}`);

        const cover_image_response = await uploadToCloudinary(cover_image_local_path);

        // Log cover image response
        logger.info(`Cover Image Response: ${cover_image_response}`);

        if (typeof cover_image_response !== 'object' || !('url' in cover_image_response)) {
            throw new APIError(400, "Invalid avatar data");
        }

        const { url: cover_image_url, public_id } = cover_image_response;

        // Create a new album
        const album = await Album.create({
            name,
            description,
            cover_image: {
                url: cover_image_url,
                public_id
            },
            artist: artist._id
        });

        // Verify the album creation operation
        if (!album) throw new APIError(400, "Create album failed");

        // Send response to the client
        res.status(201).json(new APIResponse(
            201,
            album,
            "Created",
        ));
    } catch (error) {
        logger.error(error); // Log the error using your logger
        next(error);
    }
});

// @route PUT /api/v1/albums/:id/add-track
// @desc Add song to album
// @access [Artist, Admin]
export const addTrackToAlbum = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user?.id;

        // Log user ID
        logger.info(`User ID: ${userId}`);

        // Validate userId
        if (!userId) {
            throw new APIError(401, "Invalid request, user not authenticated");
        }

        // Get albumId from request params or body
        const albumId = req.params.id || req.body.albumId;

        // Log album ID
        logger.info(`Album ID: ${albumId}`);

        // Validate albumId
        if (!albumId) {
            throw new APIError(400, "Album ID is required");
        }

        // Get artistId based on userId
        const artist = await Artist.findOne({ user: userId });

        // Log artist information
        logger.info(`Artist: ${artist}`);

        // Validate artistId
        if (!artist) {
            throw new APIError(404, "Artist not found");
        }
        const artistId = artist._id;

        // Get data from the request body
        const { trackId } = req.body;

        // Log track ID
        logger.info(`Track ID: ${trackId}`);

        // Validate the necessary data
        if (!trackId) {
            throw new APIError(400, "Track ID is required");
        }

        // Find the album by albumId
        const album = await Album.findById(albumId);

        // Log album details
        logger.info(`Album: ${album}`);

        // Validate the existence of the album
        if (!album) {
            throw new APIError(404, "Album not found");
        }

        // Check if the album belongs to the artist
        if (album.artist.toString() !== artistId.toString()) {
            throw new APIError(403, "You don't have permission to add tracks to this album");
        }

        // Find the track by trackId
        const track = await Track.findById(trackId);

        // Log track details
        logger.info(`Track: ${track}`);

        // Validate the existence of the track
        if (!track) {
            throw new APIError(404, "Track not found");
        }

        // Check if the track already exists in the album
        if (album.tracks.includes(trackId)) {
            throw new APIError(400, "Track already exists in the album");
        }

        // Add the track to the album
        album.tracks.push(trackId);
        await album.save();

        const updatedAlbum = await Album.findById(albumId);

        // Log updated album details
        logger.info(`Updated Album: ${updatedAlbum}`);

        res.status(200).json(new APIResponse(
            200,
            updatedAlbum,
            "Track added to album successfully"
        ));
    } catch (error) {
        logger.error(error); // Log the error using your logger
        next(error);
    }
});

// @route PUT /api/v1/albums/:id
// @desc Update album
// @access [Artist, Admin]
export const updateAlbum = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user?.id;

        // Log user ID
        logger.info(`User ID: ${userId}`);

        // Validate userId
        if (!userId) {
            throw new APIError(401, "Invalid request, user not authenticated");
        }

        // Get albumId from request params
        const albumId = new mongoose.Types.ObjectId(req.params.id);

        // Log album ID
        logger.info(`Album ID: ${albumId}`);

        // Validate albumId
        if (!albumId) {
            throw new APIError(400, "Album ID is required");
        }

        // Get artistId based on userId
        const artist = await Artist.findOne({ user: userId });

        // Log artist information
        logger.info(`Artist: ${artist}`);

        // Validate artistId
        if (!artist) {
            throw new APIError(404, "Artist not found");
        }
        const artistId = artist._id;

        // Find the album by albumId
        const album = await Album.findById(albumId);

        // Log album details
        logger.info(`Album: ${album}`);

        // Validate the existence of the album
        if (!album) {
            throw new APIError(404, "Album not found");
        }

        // Check if the album belongs to the artist
        if (album.artist.toString() !== artistId.toString()) {
            throw new APIError(403, "You don't have permission to update this album");
        }

        // Update the album details
        const { name, description } = req.body;

        if (name) {
            album.name = name;
        }

        if (description) {
            album.description = description;
        }

        await album.save();

        // Log updated album details
        logger.info(`Updated Album: ${album}`);

        res.status(200).json(new APIResponse(
            200,
            album,
            "Album updated successfully"
        ));
    } catch (error) {
        logger.error(error); // Log the error using your logger
        next(error);
    }
});

// @route GET /api/v1/albums/:id
// @desc Get a specific album by ID
// @access [Artist, Admin, Regular]
export const getAlbumById = asyncHandler(async (req, res, next) => {
    try {
        // Get albumId from request params
        const albumId = new mongoose.Types.ObjectId(req.params.id);

        // Log albumId
        logger.info(`Album ID: ${albumId}`);

        // Validate albumId
        if (!albumId) {
            throw new APIError(400, "Album ID is required");
        }

        // Find the album by albumId
        const album = await Album.findById(albumId);

        // Log album details
        logger.info(`Album Details: ${album}`);

        // Validate the existence of the album
        if (!album) {
            throw new APIError(404, "Album not found");
        }

        // Return the found album
        res.status(200).json(new APIResponse(
            200,
            album,
            "Album retrieved successfully"
        ));
    } catch (error) {
        logger.error(error); // Log the error using your logger
        next(error);
    }
});

// @route GET /api/v1/albums/:artistId
// @desc Get all albums of a particular artist
// @access [Artist, Admin, Regular]
export const getAllAlbum = asyncHandler(async (req, res, next) => {
    try {
        // Get artistId from request params
        const artistId = new mongoose.Types.ObjectId(req.params.artistId);

        // Log artistId
        logger.info(`Artist ID: ${artistId}`);

        // Validate artistId
        if (!artistId) {
            throw new APIError(400, "Artist ID is required");
        }

        // Find all albums of the artist
        const albums = await Album.find({ artist: artistId });
        const total = albums.length;

        // Log total albums
        logger.info(`Total Albums: ${total}`);

        // Return the albums of the artist
        res.status(200).json(new APIResponse(
            200,
            { total: total, albums },
            "All albums of the artist retrieved successfully"
        ));
    } catch (error) {
        logger.error(error); // Log the error using your logger
        next(error);
    }
});

// @route DELETE /api/v1/albums/:id/remove-track
// @desc Remove track from album
// @access [Artist, Admin]
export const removeTrackFromAlbum = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user?.id;

        // Validate userId
        if (!userId) {
            throw new APIError(401, "Invalid request, user not authenticated");
        }

        const albumId = new mongoose.Types.ObjectId(req.params.id); // Fetch albumId from route params
        if (!albumId) throw new APIError(400, "Album ID is required");

        // Log the user ID and album ID
        logger.info(`User ID: ${userId}`);
        logger.info(`Album ID: ${albumId}`);

        // Get trackId from request body
        const { trackId } = req.body;

        // Validate trackId
        if (!trackId) {
            throw new APIError(400, "Track ID is required");
        }

        // Find the album by albumId
        const album = await Album.findById(albumId);

        // Validate the existence of the album
        if (!album) {
            throw new APIError(404, "Album not found");
        }

        // Check if the user has permission to modify the album
        const artist = await Artist.findOne({ user: userId });
        if (!artist || artist._id.toString() !== album.artist.toString()) {
            throw new APIError(403, "You don't have permission to remove tracks from this album");
        }

        // Remove the track from the album's tracks list
        const index = album.tracks.indexOf(trackId);
        if (index !== -1) {
            album.tracks.splice(index, 1);
            await album.save();
        } else {
            throw new APIError(404, "Track not found in the album");
        }

        // Log success and send response
        logger.info("Track removed from album successfully");
        res.status(200).json(new APIResponse(
            200,
            album,
            "Track removed from album successfully"
        ));
    } catch (error) {
        logger.error(error); // Log the error using your logger
        next(error);
    }
});

// @route DELETE /api/v1/albums/:id/remove-album
// @desc Remove specific album
// @access [Artist, Admin]
export const removeAlbum = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user?.id;

        // Validate userId
        if (!userId) {
            throw new APIError(401, "Invalid request, user not authenticated");
        }

        // Get albumId from request params
        const albumId = new mongoose.Types.ObjectId(req.params.id);

        // Log user ID and album ID
        logger.info(`User ID: ${userId}`);
        logger.info(`Album ID: ${albumId}`);

        // Find the album by albumId
        const album = await Album.findById(albumId);

        // Validate the existence of the album
        if (!album) {
            throw new APIError(404, "Album not found");
        }

        // Check if the user has permission to delete the album
        const artist = await Artist.findOne({ user: userId });
        if (!artist || artist._id.toString() !== album.artist.toString()) {
            throw new APIError(403, "You don't have permission to remove this album");
        }

        // Delete the album
        await Album.deleteOne({ _id: albumId });

        // Log success and send response
        logger.info("Album removed successfully");
        res.status(200).json(new APIResponse(
            200,
            {},
            "Album removed successfully"
        ));
    } catch (error) {
        logger.error(error); // Log the error using your logger
        next(error);
    }
});

// @route   POST /api/v1/albums/:id/like
// @desc    Like album
// @access  [Admin, Artist, Regular]
export const likeAlbum = asyncHandler(async (req, res, next) => {
    // get userId from req.user
    const userId = req.user?.id;

    try {
        // validate user id
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // get albumId from params
        const albumId = new mongoose.Types.ObjectId(req.params.id);

        // validate album id
        if (!albumId) {
            throw new APIError(400, "Invalid albumId");
        }

        // Log user ID and album ID
        logger.info(`User ID: ${userId}`);
        logger.info(`Album ID: ${albumId}`);

        // retrieve like document if exists
        const like = await Like.findOne({ target_type: "Album", target_id: albumId, user: userId });

        // retrieve album document by using albumId
        const album = await Album.findById(albumId);

        // validate album
        if (!album || album.totalLikes === undefined) {
            throw new APIError(400, "album should not be null");
        }

        if (like) { // if already liked that album, then remove the document and decrease 1 like from totalLikes
            await Like.deleteOne(like._id);
            album.totalLikes = album.totalLikes - 1;
        } else { // else create a new document and add 1 like into totalLikes
            await Like.create({
                user: userId,
                target_type: "Album",
                target_id: albumId,
            });
            album.totalLikes = album.totalLikes + 1;
        }

        // save the album
        await album.save({ validateBeforeSave: false });

        // retrieve the new album
        const updatedAlbum = await Album.findById(albumId);

        // Log success and send response back to the client
        logger.info(`Album liked successfully. Total Likes: ${updatedAlbum?.totalLikes}`);
        res.status(200).json(new APIResponse(
            200,
            { totalLikes: updatedAlbum?.totalLikes }
        ));
    } catch (error) {
        logger.error(error); // Log the error using your logger
        next(error);
    }
});