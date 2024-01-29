import { Document, model, Model, Schema } from "mongoose";

interface playlistDocument extends Document {
    name: string;
    cover_image: {
        url: string,
        public_id: string
    };
    owner: Schema.Types.ObjectId;
    collaborator: Array<Schema.Types.ObjectId>;
    tracks: Array<Schema.Types.ObjectId>;
    total_likes: number;
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
        },
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    collaborator: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    tracks: [
        {
            type: Schema.Types.ObjectId,
            ref: "Track",
        }
    ],
    total_likes: {
        type: Number,
        default: 0
    }

}, { timestamps: true })

// Create text index for full-text search
PlaylistSchema.index({ name: 'text' });

export const Playlist = model<playlistDocument>("Playlist", PlaylistSchema);