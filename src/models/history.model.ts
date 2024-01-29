import { Schema, Document, model, Types } from "mongoose";

interface HistoryDocument extends Document {
    user: Schema.Types.ObjectId;
    track_id: Schema.Types.ObjectId;
}

const HistorySchema = new Schema<HistoryDocument>({
    user: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    track_id: {
        type: Schema.Types.ObjectId,
        required: true,
    }
}, { timestamps: true });

export const History = model<HistoryDocument>("History", HistorySchema);
