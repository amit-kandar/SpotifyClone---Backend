import { APIError } from "../utils/APIError";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { User, UserDocument } from "../models/user.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { createImageWithInitials } from "../utils/createImage";
import { APIResponse } from "../utils/APIResponse";

const generateRefreshTokenAndAccessToken = async (userId: string): Promise<{ accessToken: string, refreshToken: string }> => {
    try {
        const user: UserDocument | null = await User.findById(userId);
        if (!user) throw new APIError(404, "User not found");
        const accessToken: string = await user.generateAccessToken();
        const refreshToken: string = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new APIError(500, "Something went wrong while generating accessToken and refreshToken");
    }
}

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

export const signin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get user credentials
    const { email, password } = req.body;

    // Check for empty fields
    if (!email || !password) throw new APIError(400, "All fields are required!");

    // Check email validation
    if (!email || !/\S+@\S+\.\S+/.test(email)) throw new APIError(400, "Invalid Email");

    //Retrive the user using email
    const user = await User.findOne({ email: email });

    // Is user exists
    if (!user) throw new APIError(404, "User does not exists");

    // Compare input password and existing user password
    const isValidPassword: boolean = await user.isCorrectPassword(password);

    if (!isValidPassword) throw new APIError(401, "Invalid user credentials!");

    // generate refresh token and access token and set refreshToken into database
    const { accessToken, refreshToken } = await generateRefreshTokenAndAccessToken(user._id);

    // retrive the user from database again because refresh token has set
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // set the refreshToken and accessToken to cookies and send back user
    res
        .status(200)
        .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
        .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
        .json(new APIResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "Logged in Successfully"
        ));
})

export const signout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.user) throw new APIError(400, "Invalid access token")
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ""
            }
        });
    res
        .status(200)
        .clearCookie("accessToken", { httpOnly: true, secure: true })
        .clearCookie("refreshToken", { httpOnly: true, secure: true })
        .json(new APIResponse(200, {}, "User sign out"))
        .end();
})