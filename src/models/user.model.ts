import { Document, Schema, model, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
        required: true
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

UserSchema.pre<UserDocument>('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    } catch (error) {
        console.log("Error hashing password on user save", error);
    }
});

UserSchema.methods.isCorrectPassword = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
}

UserSchema.methods.generateAccessToken = async function (): Promise<string> {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            name: this.name
        },
        process.env.ACCESS_TOKEN_SECRET!,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        },
    );
}

UserSchema.methods.generateRefreshToken = async function (): Promise<string> {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET!,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        },
    );
}

export const User = model<UserDocument>('User', UserSchema);