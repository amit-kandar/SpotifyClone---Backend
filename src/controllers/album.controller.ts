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

// @route POST /api/v1/albums/create
// @desc Create new album
// @access [Artist, Admin]
export const createAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // userId form req.user
        const userId: mongoose.Types.ObjectId = req.user?._id;

        // check user exists or not
        if (!userId) throw new APIError(401, "Invalid request, signin again");

        // get data from req.body
        const { name, description } = req.body;

        // validate data
        if (!name || !description)
            throw new APIError(422, "All fields are required!");

        // get artistId from Artist collections
        const { _id }: mongoose.Types.ObjectId = await Artist.findOne({ user: userId }).select("_id");

        // verify artistId
        if (!_id) throw new APIError(404, "No such artist found");

        // get image local path
        let cover_image_local_path: string | undefined;

        if (!req.file?.path) {
            cover_image_local_path = "public/assets/default.jpg";
        } else {
            cover_image_local_path = req.file.path;
        }

        const cover_image_response: UploadApiResponse | string = await uploadToCloudinary(cover_image_local_path, "albums");
        if (typeof cover_image_response !== 'object' && !cover_image_response.hasOwnProperty('url')) {
            throw new APIError(400, "Invalid avatar data");
        }
        const cover_image_url = (cover_image_response as UploadApiResponse).url;
        const public_id = (cover_image_response as UploadApiResponse).public_id;

        // create new album
        const album = await Album.create({
            name,
            description,
            cover_image: {
                url: cover_image_url,
                public_id
            },
            artist: _id
        });

        // verify the album creation operation
        if (!album) throw new APIError(400, "Create album failed");

        // send response to the client
        res
            .status(201)
            .json(new APIResponse(
                201,
                album,
                "Created",
            ))
    } catch (error) {
        next(error);
    }

});

// @route PUT /api/v1/albums/:id/add-track
// @desc Add song to album
// @access [Artist, Admin]
export const addTrackToAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId: mongoose.Types.ObjectId = req.user?._id;

        // Validate userId
        if (!userId) {
            throw new APIError(401, "Invalid request, user not authenticated");
        }

        // Get albumId from request params or body
        const albumId: mongoose.Types.ObjectId = req.params.id || req.body.albumId;

        // Validate albumId
        if (!albumId) {
            throw new APIError(400, "Album ID is required");
        }

        // Get artistId based on userId
        const artist = await Artist.findOne({ user: userId });

        // Validate artistId
        if (!artist) {
            throw new APIError(404, "Artist not found");
        }
        const artistId = artist._id;

        // Get data from the request body
        const { trackId } = req.body;

        // Validate the necessary data
        if (!trackId) {
            throw new APIError(400, "Track ID is required");
        }

        // Find the album by albumId
        const album = await Album.findById(albumId);

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

        res.status(200).json(new APIResponse(
            200,
            updatedAlbum,
            "Track added to album successfully"
        ));
    } catch (error) {
        next(error);
    }
});

// @route PUT /api/v1/albums/:id
// @desc Update album
// @access [Artist, Admin]
export const updateAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId: mongoose.Types.ObjectId = req.user?._id;

        // Validate userId
        if (!userId) {
            throw new APIError(401, "Invalid request, user not authenticated");
        }

        // Get albumId from request params
        const albumId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate albumId
        if (!albumId) {
            throw new APIError(400, "Album ID is required");
        }

        // Get artistId based on userId
        const artist = await Artist.findOne({ user: userId });

        // Validate artistId
        if (!artist) {
            throw new APIError(404, "Artist not found");
        }
        const artistId: mongoose.Types.ObjectId = artist._id;

        // Find the album by albumId
        const album = await Album.findById(albumId);

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

        res.status(200).json(new APIResponse(
            200,
            album,
            "Album updated successfully"
        ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/albums/:id
// @desc Get a specific album by ID
// @access [Artist, Admin, Regular]
export const getAlbumById = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Get albumId from request params
        const albumId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate albumId
        if (!albumId) {
            throw new APIError(400, "Album ID is required");
        }

        // Find the album by albumId
        const album = await Album.findById(albumId);

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
        next(error);
    }
});

// @route GET /api/v1/albums/:artistId
// @desc Get all albums of a particular artist
// @access [Artist, Admin, Regular]
export const getAllAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // Get artistId from request params
        const artistId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.artistId);

        // Validate artistId
        if (!artistId) {
            throw new APIError(400, "Artist ID is required");
        }

        // Find all albums of the artist
        const albums = await Album.find({ artist: artistId });
        const total = albums.length;

        // Return the albums of the artist
        res.status(200).json(new APIResponse(
            200,
            { total: total, albums },
            "All albums of the artist retrieved successfully"
        ));
    } catch (error) {
        next(error);
    }
});
// @route DELETE /api/v1/albums/:id/remove-track
// @desc Remove track from album
// @access [Artist, Admin]
export const removeTrackFromAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId: mongoose.Types.ObjectId = req.user?._id;

        // Validate userId
        if (!userId) {
            throw new APIError(401, "Invalid request, user not authenticated");
        }

        const albumId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id); // Fetch albumId from route params
        if (!albumId) throw new APIError(400, "Album id is required");

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

        res.status(200).json(new APIResponse(
            200,
            album,
            "Track removed from album successfully"
        ));
    } catch (error) {
        next(error);
    }
});

// @route DELETE /api/v1/albums/:id/remove-album
// @desc Remove specific album
// @access [Artist, Admin]
export const removeAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId: mongoose.Types.ObjectId = req.user?._id;

        // Validate userId
        if (!userId) {
            throw new APIError(401, "Invalid request, user not authenticated");
        }

        // Get albumId from request params
        const albumId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // Validate albumId
        if (!albumId) {
            throw new APIError(400, "Album ID is required");
        }

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

        res.status(200).json(new APIResponse(
            200,
            {},
            "Album removed successfully"
        ));
    } catch (error) {
        next(error);
    }
});
// @route   POST /api/v1/albums/:id/like
// @desc    Like album
// @access  [Admin, Artist, Regular]
export const likeAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // get userId from req.user
    const userId: mongoose.Types.ObjectId = req.user?._id;

    try {
        // validate user id
        if (!userId) {
            throw new APIError(401, "Invalid request, sign in again");
        }

        // get albumId from params
        const albumId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        // validate album id
        if (!albumId) {
            throw new APIError(400, "Invalid albumId");
        }

        // retrive like document if exists
        const like = await Like.findOne({ target_type: "Album", target_id: albumId, user: userId });

        // retrive album document by using albumId
        const album = await Album.findById(albumId);

        // validate album
        if (!album || album.totalLikes === undefined) throw new APIError(400, "album should not be null");

        if (like) { // if already like that album then remove the document and remove 1 like from totalLikes
            await Like.deleteOne(like._id);
            album.totalLikes = album.totalLikes - 1;
        } else { // else create a new document and add 1 like into totalLikes
            await Like.create({
                user: userId,
                target_type: "Album",
                target_id: albumId,
            })
            album.totalLikes = album.totalLikes + 1;
        }

        // save the album
        await album.save({ validateBeforeSave: false });

        // retrive the new album
        const updatedAlbum = await Album.findById(albumId);

        // send response back to client
        res.status(200).json(new APIResponse(
            200,
            { totalLikes: updatedAlbum?.totalLikes }
        ));
    } catch (error) {
        next(error);
    }
});