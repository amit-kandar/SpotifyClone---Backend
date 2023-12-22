import { Document, Schema, model, Model } from "mongoose";

interface albumDocument extends Document {
    name: string;
    cover_image: string;
    artist: Schema.Types.ObjectId;
    publishAt: Date;
}

const AlbumSchema = new Schema<albumDocument, Model<albumDocument>>({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    cover_image: {
        type: String,
        default: "",
    },
    artist: {
        type: Schema.Types.ObjectId,
        ref: "Artist"
    },
    publishAt: {
        type: Date,
        required: true,
    }
}, { timestamps: true });

export const AlbumModel = model<albumDocument>('Album', AlbumSchema);