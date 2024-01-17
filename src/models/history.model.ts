import { Schema, Document, model, Model, Types } from "mongoose";

interface HistoryDocument extends Document {
    user: Types.ObjectId;
    target_type: string;
    target_id: Types.ObjectId;
}

const HistorySchema = new Schema<HistoryDocument>({
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

export const History = model<HistoryDocument>("History", HistorySchema);
