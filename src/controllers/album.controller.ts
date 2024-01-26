import { Response, Request, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import { APIError } from "../utils/APIError";
import { Album } from "../models/album.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { APIResponse } from "../utils/APIResponse";
import { Like } from "../models/like.model";
import { Track } from "../models/track.model";

// @route POST /api/v1/albums/
// @desc Create new album
// @access [Artist, Admin]
export const createAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (req.user?.role === 'regular') {
            throw new APIError(403, "Insufficient Permission.");
        }

        const { name, description } = req.body;

        if (!name || !description) {
            throw new APIError(422, "All Fields Are Required");
        }

        const cover_image_local_path = req.file?.path || "public/assets/default.jpg";

        const cover_image_response: UploadApiResponse | string = await uploadToCloudinary(cover_image_local_path, "albums");

        if (typeof cover_image_response !== 'object' || !('url' in cover_image_response)) {
            throw new APIError(400, "Failed To Upload Cover Image");
        }

        const { url: cover_image_url, public_id } = cover_image_response as UploadApiResponse;

        const album = await Album.create({
            name,
            description,
            cover_image: {
                url: cover_image_url,
                public_id
            },
            artist: user_id
        });

        if (!album) {
            throw new APIError(400, "Create Album Failed");
        }

        res.status(201).json(new APIResponse(
            201,
            album,
            "Album Created Successfully"
        ));
    } catch (error) {
        next(error);
    }
});

// @route PUT /api/v1/albums/:id/add-track
// @desc Add song to album
// @access [Artist, Admin]
export const addTrackToAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const album_id = new mongoose.Types.ObjectId(req.params.id || req.body.album_id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(album_id)) {
            throw new APIError(400, "Album ID Is Required");
        }

        const album = await Album.findById(album_id);
        if (!album) {
            throw new APIError(404, "Album Not Found");
        }

        if (album.artist.toString() !== user_id.toString() && req.user?.role === 'regular') {
            throw new APIError(403, "Permission Denied, You Don't Have Permission to Add Tracks to This Album");
        }

        const { track_id } = req.body;
        if (!track_id) {
            throw new APIError(422, "Track ID is Required");
        }

        const track = await Track.findById(track_id).lean();
        if (!track) {
            throw new APIError(404, "Track Not Found");
        }

        if (album.tracks.includes(track_id)) {
            throw new APIError(400, "Track Already Exists in the Album");
        }

        album.tracks.push(track_id);
        await album.save();

        const updatedAlbum = await Album.findById(album_id);

        res.status(200).json(new APIResponse(
            200,
            { album: updatedAlbum },
            "Track Added to Album Successfully"
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
        const user_id = req.user?._id;
        const album_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        if (!mongoose.Types.ObjectId.isValid(album_id)) {
            throw new APIError(400, "Album ID is Required");
        }

        const album = await Album.findById(album_id);

        if (!album) {
            throw new APIError(404, "Album Not Found");
        }

        if (album.artist.toString() !== user_id.toString() && req.user.role === 'regular') {
            throw new APIError(403, "Permission Denied, You Don't Have Permission to Update This Album");
        }

        const { name, description } = req.body;

        if (!name && !description) {
            throw new APIError(422, "Atleast One Field Is Required")
        }

        if (name) {
            album.name = name;
        }

        if (description) {
            album.description = description;
        }

        const updatedAlbum = await album.save();
        if (!updatedAlbum) {
            throw new APIError(400, "Failed To Update The Album")
        }

        res.status(200).json(new APIResponse(
            200,
            { album: updatedAlbum },
            "Album Updated Successfully"
        ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/albums/:id
// @desc Get a specific album by ID
// @access [Artist, Admin, Regular]
export const getAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const album_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        if (!mongoose.Types.ObjectId.isValid(album_id)) {
            throw new APIError(400, "Album ID is Required");
        }

        const album = await Album.findById(album_id).lean();

        if (!album) {
            throw new APIError(404, "Album not found");
        }

        res.status(200).json(new APIResponse(
            200,
            { album },
            "Album retrieved successfully"
        ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/albums/
// @desc Get all albums of a particular artist
// @access [Artist, Admin, Regular]
export const getAlbums = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const artist_id = new mongoose.Types.ObjectId(req.body.artist_id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        if (!mongoose.Types.ObjectId.isValid(artist_id)) {
            throw new APIError(400, "Artist ID Is Required");
        }

        const albums = await Album.find({ artist: artist_id }).lean();
        if (!albums) {
            throw new APIError(400, "Failed To Retrive The Albums");
        }

        res.status(200).json(new APIResponse(
            200,
            { total: albums.length, albums },
            "All Albums Of The Artist Retrieved Successfully"
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
        const user_id = req.user?._id;
        const album_id = new mongoose.Types.ObjectId(req.params.id);
        const { track_id } = req.body;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        if (!mongoose.Types.ObjectId.isValid(album_id)) {
            throw new APIError(400, "Album ID Is Required");
        }

        if (!track_id) {
            throw new APIError(400, "Track ID Is Required");
        }

        const album = await Album.findById(album_id);
        if (!album) {
            throw new APIError(404, "Album Not Found");
        }

        if (user_id.toString() !== album.artist.toString() && req.user.role === 'regular') {
            throw new APIError(403, "You Don't Have Permission To Remove Tracks From This Album");
        }

        const index = album.tracks.indexOf(track_id);

        if (index !== -1) {
            album.tracks.splice(index, 1);
            await album.save();
        } else {
            throw new APIError(404, "Track Not Found In The Album");
        }

        const updatedAlbum = await Album.findById(album_id).lean();

        if (!updatedAlbum) {
            throw new APIError(400, "Failed To Retrive The Updated Album");
        }

        res.status(200).json(new APIResponse(
            200,
            { album: updatedAlbum },
            "Track Removed From Album Successfully"
        ));
    } catch (error) {
        next(error);
    }
});

// @route DELETE /api/v1/albums/:id
// @desc Remove specific album
// @access [Artist, Admin]
export const removeAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const album_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        if (!mongoose.Types.ObjectId.isValid(album_id)) {
            throw new APIError(400, "Album ID Is Required");
        }

        const album = await Album.findById(album_id).lean();

        if (!album) {
            throw new APIError(404, "Album Not Found");
        }

        if (user_id.toString() !== album.artist.toString() && req.user.role === 'regular') {
            throw new APIError(403, "You Don't Have Permission To Remove This Album");
        }

        await Album.deleteOne({ _id: album_id });

        res.status(200).json(new APIResponse(
            200,
            {},
            "Album Removed Successfully"
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/albums/:id/like
// @desc    Like album
// @access  [Admin, Artist, Regular]
export const likeUnlikeAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const album_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        if (!mongoose.Types.ObjectId.isValid(album_id)) {
            throw new APIError(400, "Album ID Is Required");
        }

        const album = await Album.findById(album_id);
        if (!album) {
            throw new APIError(404, "Album Doesn't Exists")
        }

        const like = await Like.findOne({ target_type: "Album", target_id: album_id, user: user_id }).lean();

        let message: string;

        if (like) { // if already like that album then remove the document and remove 1 like from total_likes
            await Like.deleteOne(like._id);
            album.total_likes -= 1;
            message = "Successfully Unlike The Album";
        } else { // else create a new document and add 1 like into total_likes
            await Like.create({
                user: user_id,
                target_type: "Album",
                target_id: album_id,
            });
            album.total_likes += 1;
            message = "Successfully Like The Album";
        }

        await album.save();
        const updatedAlbum = await Album.findById(album_id);
        res.status(200).json(new APIResponse(
            200,
            { total_likes: updatedAlbum?.total_likes },
            message
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/albums/liked
// @desc    Get All Like Album
// @access  [Admin, Artist, Regular]
export const likedAlbum = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = new mongoose.Types.ObjectId(req.user?._id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        const albums = await Like.aggregate([
            { $match: { user: user_id, target_type: 'Album' } },
            {
                $lookup: {
                    from: 'albums',
                    foreignField: '_id',
                    localField: 'target_id',
                    as: 'likedAlbums'
                }
            },
            { $unwind: '$likedAlbums' },
            {
                $project: {
                    _id: '$likedAlbums._id',
                    name: '$likedAlbums.name',
                    description: '$likedAlbums.description',
                    cover_image: '$likedAlbums.cover_image',
                    artist: '$likedAlbums.artist',
                    tracks: '$likedAlbums.tracks',
                    totalLikes: '$likedAlbums.totalLikes',
                    createdAt: '$likedAlbums.createdAt',
                    updatedAt: '$likedAlbums.updatedAt',
                    __v: '$likedAlbums.__v',
                    total_likes: '$likedAlbums.total_likes'
                }
            }
        ]);

        if (!albums) {
            throw new APIError(400, "Failed To Fetch The Liked Albums.");
        }

        res.status(200).json(new APIResponse(200, { total: albums.length, albums }, "Successfully Fetched All The Liked ALbums"));
    } catch (error) {
        next(error);
    }
});