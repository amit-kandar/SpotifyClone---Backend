import { Request } from 'express';
import { Document, Schema, model, Model, Types } from "mongoose";
export interface RequestDocument {
    _id: Types.ObjectId
    artist_id: Types.ObjectId
    name: string;
    username: string;
    role: string;
    email: string;
    avatar: {
        url: string,
        public_id: string
    };
    date_of_birth: Date;
    genre: string;
    bio: string;
    totalLikes: number;

}

declare global {
    namespace Express {
        interface Request {
            user: RequestDocument;
        }
    }
}