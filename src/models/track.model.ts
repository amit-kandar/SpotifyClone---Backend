import { Schema, Document, model, Model } from "mongoose";

interface trackDocument extends Document {
    title: string;
    cover_image: {
        url: string,
        public_id: string
    };
    duration: number;
    track: {
        url: string,
        public_id: string
    };
    artist: Schema.Types.ObjectId;
    genre: string;
    lyrics: string;
    releaseDate: Date;
    total_likes: number;
}

const TrackSchema = new Schema<trackDocument, Model<trackDocument>>({
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    cover_image: {
        type: {
            url: { type: String, required: true }, // Cloudinary URL
            public_id: { type: String, required: true } // Cloudinary public_id
        },
        required: true,
    },
    duration: {
        type: Number,
        required: true
    },
    track: {
        type: {
            url: { type: String, required: true }, // Cloudinary URL
            public_id: { type: String, required: true } // Cloudinary public_id
        },
        required: true
    },
    artist: {
        type: Schema.Types.ObjectId,
        ref: 'Artist',
    },
    genre: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    releaseDate: {
        type: Date,
        default: () => new Date()
    },
    lyrics: {
        type: String,
        default: ""
    },
    total_likes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Create text index for full-text search
TrackSchema.index({ title: 'text', genre: 'text' });

export const Track = model<trackDocument>('Track', TrackSchema);