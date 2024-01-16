import { Document, Schema, model, Model } from "mongoose";

interface albumDocument extends Document {
    name: string;
    description: string;
    cover_image: {
        url: string,
        public_id: string
    };
    artist: Schema.Types.ObjectId;
    tracks: [Schema.Types.ObjectId];
    totalLikes: number;
}

const AlbumSchema = new Schema<albumDocument, Model<albumDocument>>({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    description: {
        type: String,
        required: false,
        default: ""
    },
    cover_image: {
        type: {
            url: { type: String, required: true },
            public_id: { type: String, required: true }
        }
    },
    artist: {
        type: Schema.Types.ObjectId,
        ref: "Artist",
        index: true
    },
    tracks: [{
        type: Schema.Types.ObjectId,
        ref: "Tracks"
    }],
    totalLikes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Create text index for full-text search
AlbumSchema.index({ name: 'text' });

export const Album = model<albumDocument>('Album', AlbumSchema);