import { Document, Schema, model, Model } from 'mongoose';

interface ArtistDocument extends Document {
    user: Schema.Types.ObjectId;
    genre: string;
    bio: string;
    total_likes: number;
}

const ArtistSchema = new Schema<ArtistDocument, Model<ArtistDocument>>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    genre: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    bio: {
        type: String,
        required: true,
        trim: true
    },
    total_likes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Create text index for full-text search
ArtistSchema.index({ name: 'text' });

export const Artist = model<ArtistDocument>('Artist', ArtistSchema);