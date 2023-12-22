import { Schema, Document, model, Model } from "mongoose";

interface likeDocument extends Document {
    user: Schema.Types.ObjectId;
    target_type?: string;
    target_id?: string;
    likedAt: Date;
}

const LikeSchema = new Schema<likeDocument, Model<likeDocument>>({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    target_type: {
        type: String,
        enum: ['Track', 'Playlist', 'Artist'],
        required: true,
    },
    target_id: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    likedAt: {
        type: Date,
        default: Date.now(),
    }
}, { timestamps: true });

export const LikeModel = model<likeDocument>("Like", LikeSchema);