import { Document, Schema, model, Model } from 'mongoose';

interface ArtistDocument extends Document {
    user: Schema.Types.ObjectId;
    genre: string;
    bio: string;
    totalLikes: number;
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
    totalLikes: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export const Artist = model<ArtistDocument>('Artist', ArtistSchema);