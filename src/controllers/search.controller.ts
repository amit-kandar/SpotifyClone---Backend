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

export const search = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            throw new APIError(401, "Unauthorized. Please Sign in Again");
        }

        const query = req.query.q;
        if (!query || typeof query !== 'string') {
            throw new APIError(400, "Invalid Query Parameter");
        }

        const response = await searchQuery(query);

        await Search.create({ user: userId, query: query });

        res.status(200).json(new APIResponse(200, { total: response.length, response }, "Successfully Fetched The Searched Results"));
    } catch (error) {
        next(error);
    }
});

export const getHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userID = req.user?._id;

        if (!userID) {
            throw new APIError(401, "Unauthorized. Please Sign in Again");
        }

        const history = await Search.find({ user: userID });

        if (!history) {
            throw new APIError(404, "No Search History Found");
        }

        res.status(200).json(new APIResponse(200, { total: history.length, history }, "Fetched All Searched Histories"));
    } catch (error) {
        next(error);
    }
});

export const deleteOneSearch = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userID = req.user?._id;

        if (!userID) {
            throw new APIError(401, "Unauthorized. Please Sign in Again");
        }

        const searchID: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(req.params.id);

        if (!searchID) {
            throw new APIError(400, "Invalid Search ID");
        }

        await Search.deleteOne({ user: userID, _id: searchID });

        res.status(200).json(new APIResponse(200, "Successfully Deleted"));
    } catch (error) {
        next(error);
    }
});

export const clearAll = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userID = req.user?._id;

        if (!userID) {
            throw new APIError(401, "Unauthorized. Please Sign in Again");
        }

        await Search.deleteMany({ user: userID });

        res.status(200).json(new APIResponse(200, "Successfully deleted all searches"));
    } catch (error) {
        next(error);
    }
});
