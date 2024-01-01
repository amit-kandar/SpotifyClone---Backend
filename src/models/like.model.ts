import mongoose, { Schema, Document, model, Model, Types } from "mongoose";
import { APIError } from "../utils/APIError";

interface Like extends Document {
    user: Types.ObjectId;
    target_type: string;
    target_id: Types.ObjectId;
}

const LikeSchema = new Schema<Like>({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    target_type: {
        type: String,
        enum: ['Track', 'Playlist', 'Album'],
        required: true,
    },
    target_id: {
        type: Schema.Types.ObjectId,
        required: true,
    }
}, { timestamps: true });

export const Like = model<Like>("Like", LikeSchema);
