import { Document, Schema, model, Model } from 'mongoose';

interface UserDocument extends Document {
    name: string;
    email: string;
    avatar: string;
    password: string;
    date_of_birth: Date;
    listen_history: Array<Schema.Types.ObjectId>,
    refresh_token: string;
}

const UserSchema = new Schema<UserDocument, Model<UserDocument>>({
    id: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    avatar: {
        type: String, // cloudinary url
        default: ""
    },
    password: {
        type: String,
        required: true,
    },
    date_of_birth: {
        type: Date,
        required: true,
    },
    listen_history: [
        {
            type: Schema.Types.ObjectId,
            ref: "Track",
        }
    ],
    refresh_token: {
        type: String,
    }
}, { timestamps: true });

export const UserModel = model<UserDocument>('User', UserSchema);