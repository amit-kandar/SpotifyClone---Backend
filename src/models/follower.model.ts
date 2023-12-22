import { Schema, model, Model, Document } from "mongoose";

interface followerDocument extends Document {
    user: Schema.Types.ObjectId;
    artist: Schema.Types.ObjectId;
}

const FollowerSchema = new Schema<followerDocument, Model<followerDocument>>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    artist: {
        type: Schema.Types.ObjectId,
        ref: "Artist"
    }
}, { timestamps: true });

export const FollowerModel = model<followerDocument>("Follower", FollowerSchema);