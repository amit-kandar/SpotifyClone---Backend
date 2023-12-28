import { Document, Schema, model, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export interface UserDocument extends Document {
    name: string;
    username: string;
    userType?: string;
    email: string;
    avatar: string;
    password: string;
    date_of_birth: Date;
    refreshToken: string;
    isCorrectPassword(password: string): Promise<boolean>;
    generateAccessToken(): Promise<string>;
    generateRefreshToken(): Promise<string>;
}

const UserSchema = new Schema<UserDocument, Model<UserDocument>>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    userType: {
        type: String,
        enum: ['regular', 'artist', 'admin'], // Example user types
        default: 'regular'
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
    refreshToken: {
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