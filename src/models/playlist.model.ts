import { Document, model, Model, Schema } from "mongoose";

interface playlistDocument extends Document {
    name: string;
    cover_image: {
        url: string,
        public_id: string
    };
    user: Schema.Types.ObjectId;
    track: Array<Schema.Types.ObjectId>;
    totalLikes: number;
}

const PlaylistSchema = new Schema<playlistDocument, Model<playlistDocument>>({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    cover_image: {
        type: {
            url: { type: String, required: true },
            public_id: { type: String, required: true }
        }
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    track: [
        {
            type: Schema.Types.ObjectId,
            ref: "Track",
        }
    ],
    totalLikes: {
        type: Number,
        default: 0
    }

}, { timestamps: true })

// Create text index for full-text search
PlaylistSchema.index({ name: 'text' });

export const Playlist = model<playlistDocument>("Playlist", PlaylistSchema);