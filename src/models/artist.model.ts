import { Document, Schema, model, Model } from 'mongoose';

interface ArtistDocument extends Document {
    name: string;
    genre: string;
    image: string;
}

const ArtistSchema = new Schema<ArtistDocument, Model<ArtistDocument>>({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    genre: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    image: {
        type: String, //cloudinary url
        default: ""
    },
}, { timestamps: true });

export const ArtistModel = model<ArtistDocument>('Artist', ArtistSchema);