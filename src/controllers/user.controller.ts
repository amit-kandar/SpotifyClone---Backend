import { APIError } from "../utils/APIError";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { User } from "../models/user.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { createImageWithInitials } from "../utils/createImage";
import { APIResponse } from "../utils/APIResponse";

export const signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get user details
    const { name, email, password, date_of_birth } = req.body; // Date should be YYYY-MM-DD format

    // Check for empty fields
    if (!name || !email || !password || !date_of_birth) throw new APIError(400, "All fields are required!");

    // Check email validation
    if (!email || !/\S+@\S+\.\S+/.test(email)) throw new APIError(400, "Invalid Email");

    // Check if user already exists
    const existedUser = await User.findOne({ email: email });
    if (existedUser) throw new APIError(409, "Email already exists!");

    // Check for image
    let avatarLocalPath: string | undefined;

    if (!req.file?.path) {
        avatarLocalPath = await createImageWithInitials(name);
    } else {
        avatarLocalPath = req.file.path;
    }

    // Upload the image to the cloudinary
    const avatarURL: UploadApiResponse | string = await uploadToCloudinary(avatarLocalPath);

    if (typeof avatarURL !== 'string' || avatarURL.trim() === '') {
        throw new APIError(400, "Avatar upload failed");
    }

    // Create a user object and save it to datebase
    const user = await User.create({
        name,
        email,
        password,
        date_of_birth,
        avatar: avatarURL!,
    })

    // Check for user creation operation is successfull or not and remove password and refresh_token
    const created_user = await User.findById(user._id).select("-password -refresh_token")

    // return response to user
    res.status(201).json(new APIResponse(200, created_user, "User created successfully"));
    return;
})