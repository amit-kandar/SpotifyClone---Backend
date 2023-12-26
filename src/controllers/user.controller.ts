import { APIError } from "../utils/APIError";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";
import { User, UserDocument } from "../models/user.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { UploadApiResponse } from "cloudinary";
import { createImageWithInitials } from "../utils/createImage";
import { APIResponse } from "../utils/APIResponse";
import jwt from "jsonwebtoken";
import { generateUniqueUsernameFromName } from "../utils/generateUsername";

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

// @route   POST /api/v1/users/check-email
// @desc    Check if email exists
// @access  Public
export const checkEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // get email from body
    const { email } = req.body;

    // Check email validation
    if (!email || !/\S+@\S+\.\S+/.test(email)) throw new APIError(400, "Invalid Email");

    // check email exists in the database
    let user = await User.findOne({ email });

    // send response to user with email_exists
    res
        .status(200)
        .json(new APIResponse(
            200,
            {
                email_exists: Boolean(user)
            }
        ))
})

// @route   POST /api/v1/users/signup
// @desc    User signup
// @access  Public
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

    const username = generateUniqueUsernameFromName(name);

    // Create a user object and save it to datebase
    const user = await User.create({
        name,
        username,
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

// @route   POST /api/v1/users/signin
// @desc    User signin
// @access  Public
export const signin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get user credentials
    const { email, username, password } = req.body;

    // Check for empty fields
    if ((!email && !username) || !password) throw new APIError(400, (!email && !username) ? "Email or username is required!" : "Password is required!");


    // Check email validation
    if (email && !/\S+@\S+\.\S+/.test(email)) throw new APIError(400, "Invalid Email");

    //Retrive the user using email
    const user = await User.findOne({ $or: [{ username }, { email }] });

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

// @route   POST /api/v1/users/signout
// @desc    User signout
// @access  Private
export const signout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await User.findByIdAndUpdate(
        req.user?._id,
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

// @route   POST /api/v1/users/refresh-token
// @desc    Get Access Token by Refresh Token
// @access  Private
export const getAccessTokenByRefreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get refresh token
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // check empty field
    if (!incomingRefreshToken) throw new APIError(403, "Unauthorized Request");

    // fetch token secret
    const refreshSecret: string | undefined = process.env.REFRESH_TOKEN_SECRET;
    if (!refreshSecret) throw new APIError(404, "secret not found");

    try {
        // validate refresh token
        const decoded = jwt.verify(incomingRefreshToken, refreshSecret);
        if (typeof decoded === "string") throw new APIError(400, "Invalid decoded information");

        // retrive user from database
        const user = await User.findById(decoded._id).select("-password");
        if (!user) throw new APIError(400, "User Not found");

        // compare stored refresh token with incoming refresh token
        if (user.refreshToken !== incomingRefreshToken) throw new APIError(401, "Invalid request, please login again.");

        // generate refresh token and access token and set refreshToken into database
        const { accessToken, refreshToken } = await generateRefreshTokenAndAccessToken(user._id);

        // set the refreshToken and accessToken to cookies and send back user
        res
            .status(200)
            .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
            .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
            .json(new APIResponse(
                200,
                {
                    accessToken,
                    refreshToken
                },
                "Access token refreshed successfully"
            ));
    } catch (error) {
        throw new APIError(500, "Error while refreshing access token")
    }

})

// @route   GET /api/v1/users/user
// @desc    Get user details
// @access  Private
export const getUserDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res
        .status(200)
        .json(new APIResponse(
            200,
            { user: req.user as UserDocument },
            "fetched user successfully"
        ))
})

// @route   PUT /api/v1/users/user
// @desc    Update user details
// @access  Private
export const updateUserDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?._id;

    try {
        const user = await User.findById(userId).select("-password -refreshToken");

        if (!user) throw new APIError(404, "User not found");

        const { name, email, date_of_birth } = req.body;

        if (name) user.name = name;
        if (email) user.email = email;
        if (date_of_birth) user.date_of_birth = date_of_birth;

        await user.save({ validateBeforeSave: false });

        res
            .status(200)
            .json(new APIResponse(
                200,
                "User updated successfully"
            ));
    } catch (error) {
        throw new APIError(500, "Internal server error");
    }
})