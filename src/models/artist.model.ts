import { Document, Schema, model, Model } from 'mongoose';

interface ArtistDocument extends Document {
    user: Schema.Types.ObjectId;
    genre: string;
    bio: string;
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
    }
}, { timestamps: true });

export const Artist = model<ArtistDocument>('Artist', ArtistSchema);