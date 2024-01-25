import { NextFunction, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { Track } from '../models/track.model';
import { Album } from '../models/album.model';
import { Playlist } from '../models/playlist.model';
import { APIError } from '../utils/APIError';
import { User } from '../models/user.model';
import { APIResponse } from '../utils/APIResponse';
import { Search } from '../models/search.model';
import mongoose, { Schema } from 'mongoose';
import logger from '../config/logger';

const searchQuery = async (query: string) => {
    try {
        // Perform the search on other models based on the query
        const [tracks, albums, playlists, artists] = await Promise.all([
            Track.find({ $text: { $search: query } }), // Full-text search on 'title' and 'genre'
            Album.find({ $text: { $search: query } }), // Full-text search on 'name'
            Playlist.find({ $text: { $search: query } }), // Full-text search on 'name'
            User.find({ $text: { $search: query }, role: 'artist' })
                .select("-password -refreshToken") // Exclude specified fields
        ]);

        return [...tracks, ...albums, ...playlists, ...artists];
    } catch (error) {
        throw new APIError(500, "Error In searchQuery Function");
    }
};

// @route   GET /api/v1/searches/search
// @desc    Search A Query
// @access  [admin, artist, regular]
export const search = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const query = req.query.q;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!query || typeof query !== 'string') {
            throw new APIError(400, "Invalid Query Parameter");
        }

        const response = await searchQuery(query);
        if (!response) {
            throw new APIError(400, "Failed To Search Query");
        }

        const search = await Search.create({ user: user_id, query: query });
        if (!search) {
            throw new APIError(400, "Failed To Add Search Query Into Search Document");
        }

        res.status(200).json(new APIResponse(200, { total: response.length, searches: response }, "Successfully Fetched The Searched Results"));
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/v1/searches/
// @desc    Get All Search History
// @access  [admin, artist, regular]
export const getHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        const search = await Search.find({ user: user_id }).lean();

        if (!search) {
            throw new APIError(404, "No Search History Found");
        }

        res.status(200).json(new APIResponse(200, { total: search.length, history: search }, "Fetched All Searched Histories"));
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/v1/searches/:id
// @desc    Delete One History
// @access  [admin, artist, regular]
export const deleteOneSearch = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;
        const search_id = new mongoose.Types.ObjectId(req.params.id);

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        if (!mongoose.Types.ObjectId.isValid(search_id)) {
            throw new APIError(400, "Invalid Search ID");
        }

        const search = await Search.findById(search_id).lean();
        if (!search) {
            throw new APIError(400, "Failed To Retrive Search");
        }

        await Search.deleteOne({ user: user_id, _id: search_id });

        res.status(200).json(new APIResponse(200, {}, "Successfully Deleted"));
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/v1/searches/clear-all
// @desc    Delete All Search History
// @access  [admin, artist, regular]
export const clearAll = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user_id = req.user?._id;

        if (!mongoose.Types.ObjectId.isValid(user_id)) {
            throw new APIError(401, "Unauthorized Request, Signin Again");
        }

        await Search.deleteMany({ user: user_id });

        res.status(200).json(new APIResponse(200, {}, "Successfully deleted all searches"));
    } catch (error) {
        next(error);
    }
});