import { Document, model, Model, Schema } from "mongoose";

interface playlistDocument extends Document {
    name: string;
    cover_image: string;
    user: Array<Schema.Types.ObjectId>;
    track: Array<Schema.Types.ObjectId>;
}

const PlaylistSchema = new Schema<playlistDocument, Model<playlistDocument>>({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    cover_image: {
        type: String,
        default: ""
    },
    user: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    track: [
        {
            type: Schema.Types.ObjectId,
            ref: "Track",
        }
    ]

}, { timestamps: true })

export const PlaylistModel = model<playlistDocument>("Playlist", PlaylistSchema);