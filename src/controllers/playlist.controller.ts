import { Response, Request, NextFunction } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import mongoose from "mongoose";
import { APIError } from "../utils/APIError";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { APIResponse } from "../utils/APIResponse";
import { Like } from "../models/like.model";
import { Playlist } from "../models/playlist.model";
import { Track } from "../models/track.model";

// @route POST /api/v1/playlists/
// @desc Create new playlist
// @access [Artist, Admin, Regular]
export const createPlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        const { name } = req.body;

        if (!name) {
            throw new APIError(400, "Name Is Required");
        }

        const cover_image_local_path = req.file?.path || "public/assets/default.jpg";

        const cover_image_response: UploadApiResponse | string = await uploadToCloudinary(cover_image_local_path, "playlists");
        if (typeof cover_image_response !== 'object' || !('url' in cover_image_response)) {
            throw new APIError(400, "Failed To Upload Cover Image");
        }

        const { url: cover_image_url, public_id } = cover_image_response as UploadApiResponse;

        const playlist = await Playlist.create({
            name,
            cover_image: {
                url: cover_image_url,
                public_id
            },
            owner: user_id
        });

        res.status(201).json(new APIResponse(
            201,
            playlist,
            "Playlist Created Successfully",
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
        const user_id = req.user?._id;
        const playlist_id = new mongoose.Types.ObjectId(req.params.id);
        const { track_id } = req.body;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(track_id)) {
            throw new APIError(400, "Track ID is Required");
        }

        if (!mongoose.Types.ObjectId.isValid(playlist_id)) {
            throw new APIError(400, "Invalid Playlist ID");
        }

        const track = await Track.findById(track_id).lean();
        if (!track) {
            throw new APIError(400, "Track Doesn't Exists");
        }

        const playlist = await Playlist.findById(playlist_id);

        if (!playlist) {
            throw new APIError(404, "Playlist Not Found");
        }

        if (playlist.owner.toString() !== user_id.toString()) {
            throw new APIError(403, "Permission Denied, You Don't Have Permission To Perform This Action");
        }

        if (playlist.tracks.includes(track_id)) {
            throw new APIError(400, "Track Already Exists in the Playlist");
        }

        playlist.tracks.push(track_id);

        const updatedPlalist = await playlist.save();

        if (!updatedPlalist) {
            throw new APIError(400, "Failed To Add The Track To The Playlist");
        }

        res.status(200).json(new APIResponse(
            200,
            { playlist: updatedPlalist },
            "Track Added To The Playlist Successfully",
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
        const user_id = req.user?._id;
        const playlist_id = new mongoose.Types.ObjectId(req.params.id);

        const { name } = req.body;
        const cover_image_local_path = req.file?.path;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(playlist_id)) {
            throw new APIError(400, "Invalid Playlist ID");
        }

        if (!name && cover_image_local_path) {
            throw new APIError(400, "Atleast One Field Is Required");
        }

        const playlist = await Playlist.findById(playlist_id);

        if (!playlist) {
            throw new APIError(404, "Failed To Retrive The Playlist");
        }

        if (playlist.owner.toString() !== user_id.toString()) {
            throw new APIError(403, "Permission Denied, You Don't Have Permission To Modify This Playlist");
        }

        if (name) {
            playlist.name = name;
        }

        if (cover_image_local_path) {
            const cover_image_response: UploadApiResponse | string = await uploadToCloudinary(cover_image_local_path, "playlists");

            if (typeof cover_image_response !== 'object' || !('url' in cover_image_response)) {
                throw new APIError(400, "Failed To Upload Cover Image");
            }

            const { url: cover_image_url, public_id } = cover_image_response as UploadApiResponse;

            playlist.cover_image.url = cover_image_url;
            playlist.cover_image.public_id = public_id;
        }

        const updatedPlaylist = await playlist.save();
        if (!updatedPlaylist) {
            throw new APIError(400, "Failed To Update The Playlist");
        }

        res.status(200).json(new APIResponse(
            200,
            { playlist: updatedPlaylist },
            "Playlist Updated Successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/playlists/:id
// @desc Get a specific playlist by ID
// @access [Artist, Admin, Regular]
export const getPlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const playlist_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(playlist_id)) {
            throw new APIError(400, "Invalid Playlist ID");
        }

        const playlist = await Playlist.find({ _id: playlist_id, owner: user_id });

        if (!playlist) {
            throw new APIError(404, "Failed To Retrive The PLaylist");
        }

        res.status(200).json(new APIResponse(
            200,
            playlist,
            "Playlist Retrieved Successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route GET /api/v1/playlists/
// @desc Get all playlists of a particular user
// @access [Artist, Admin, Regular]
export const getPlaylists = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        const playlists = await Playlist.find({ owner: user_id });
        if (!playlists) {
            throw new APIError(400, "Failed To Retrive The Playlist");
        }

        res.status(200).json(new APIResponse(
            200,
            playlists,
            "Playlists Retrieved Successfully",
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
        const user_id = req.user?._id;
        const playlist_id = new mongoose.Types.ObjectId(req.params.id);
        const { track_id } = req.body;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(playlist_id)) {
            throw new APIError(400, "Invalid Playlist ID");
        }

        if (!track_id) {
            throw new APIError(400, "Invalid Track ID");
        }

        const retrivedPlaylist = await Playlist.find({ _id: playlist_id, owner: user_id });

        if (!retrivedPlaylist) {
            throw new APIError(400, "Failed To Retrive The Playlist");
        }

        const playlist = retrivedPlaylist[0];

        if (user_id.toString() !== playlist.owner.toString()) {
            throw new APIError(403, "You Don't Have Permission To Remove Tracks From This Playlist");
        }

        const index = playlist.tracks.indexOf(track_id);
        let updatedPlaylist;
        if (index !== -1) {
            playlist.tracks.splice(index, 1);
            updatedPlaylist = await playlist.save();
        } else {
            throw new APIError(404, "Track Not Found In The Playlist");
        }

        if (!updatedPlaylist) {
            throw new APIError(404, "Failed To Remove The Track From Playlist");
        }

        res.status(200).json(new APIResponse(
            200,
            { playlist: updatedPlaylist },
            "Track Removed From The Playlist Successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route DELETE /api/v1/playlists/:id
// @desc Remove specific playlist
// @access [Artist, Admin, Regular]
export const removePlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const playlist_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(playlist_id)) {
            throw new APIError(400, "Invalid Playlist ID");
        }

        const playlist = await Playlist.findOneAndDelete({ _id: playlist_id, owner: user_id });

        if (!playlist) {
            throw new APIError(404, "Failed To Remove The Playlist");
        }

        res.status(200).json(new APIResponse(
            200,
            {},
            "Playlist Removed Successfully",
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/playlists/:id/like
// @desc    Like playlist
// @access  [Admin, Artist, Regular]
export const likePlaylist = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const playlist_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        if (!mongoose.Types.ObjectId.isValid(playlist_id)) {
            throw new APIError(400, "Playlist ID Is Required");
        }

        const playlist = await Playlist.findById(playlist_id);
        if (!playlist) {
            throw new APIError(404, "Playlist Doesn't Exists")
        }

        const like = await Like.findOne({ target_type: "Playlist", target_id: playlist_id, user: user_id }).lean();

        let message: string;

        if (like) { // if already like that Playlist then remove the document and remove 1 like from total_likes
            await Like.deleteOne(like._id);
            playlist.total_likes -= 1;
            message = "Successfully Unlike The Playlist";
        } else { // else create a new document and add 1 like into total_likes
            await Like.create({
                user: user_id,
                target_type: "Playlist",
                target_id: playlist_id,
            });
            playlist.total_likes += 1;
            message = "Successfully Like The Playlist";
        }

        await playlist.save();
        const updatedPlaylist = await Playlist.findById(playlist_id);
        res.status(200).json(new APIResponse(
            200,
            { total_likes: updatedPlaylist?.total_likes },
            message
        ));
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/v1/playlists/liked
// @desc    Get All Like Playlists
// @access  [Admin, Artist, Regular]
export const likedPlaylists = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = new mongoose.Types.ObjectId(req.user?._id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Sign In Again");
        }

        const playlists = await Like.aggregate([
            { $match: { user: user_id, target_type: 'Playlist' } },
            {
                $lookup: {
                    from: 'playlists',
                    foreignField: '_id',
                    localField: 'target_id',
                    as: 'likedPlaylists'
                }
            },
            { $unwind: '$likedPlaylists' },
            {
                $project: {
                    _id: '$likedPlaylists._id',
                    name: '$likedPlaylists.name',
                    description: '$likedPlaylists.description',
                    cover_image: '$likedPlaylists.cover_image',
                    artist: '$likedPlaylists.artist',
                    tracks: '$likedPlaylists.tracks',
                    totalLikes: '$likedPlaylists.totalLikes',
                    createdAt: '$likedPlaylists.createdAt',
                    updatedAt: '$likedPlaylists.updatedAt',
                    __v: '$likedPlaylists.__v',
                    total_likes: '$likedPlaylists.total_likes'
                }
            }
        ]);

        if (!playlists) {
            throw new APIError(400, "Failed To Fetch The Liked Playlists.");
        }

        res.status(200).json(new APIResponse(200, { total: playlists.length, playlists }, "Successfully Fetched All The Liked Playlists"));
    } catch (error) {
        next(error);
    }
});