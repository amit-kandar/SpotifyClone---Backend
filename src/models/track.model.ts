import { Schema, Document, model, Model } from "mongoose";

interface trackDocument extends Document {
    title: string;
    cover_image: string;
    album?: Array<Schema.Types.ObjectId>;
    duration: number;
}

const TrackSchema = new Schema<trackDocument, Model<trackDocument>>({
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    cover_image: {
        type: String, //cloudinary url
        required: true,
    },
    album: [
        {
            type: Schema.Types.ObjectId,
            ref: "Album"
        }
    ],
    duration: {
        type: Number,
        required: true
    }
}, { timestamps: true });

export const TrackModel = model<trackDocument>('Track', TrackSchema);