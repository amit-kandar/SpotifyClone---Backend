import { Router } from "express";
import {
    changeAvatar,
    changePassword,
    checkEmail,
    followArtist,
    followingArtist,
    getAccessTokenByRefreshToken,
    getArtistById,
    getArtists,
    getUserDetails,
    resetPassword,
    signin,
    signout,
    signup,
    updateUserDetails
} from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

// public routes
router.route("/signup").post(upload.single("avatar"), signup);
router.route("/signin").post(signin);
router.route("/check-email").post(checkEmail);

// Secured Routes
router.route("/signout").get(checkAuth, signout);
router.route("/refresh-token").post(getAccessTokenByRefreshToken)
router.route("/user").get(checkAuth, getUserDetails);
router.route("/user").put(checkAuth, updateUserDetails);
router.route("/change-avatar").put(checkAuth, upload.single("avatar"), changeAvatar);
router.route("/change-password").put(checkAuth, changePassword);
router.route("/reset-password").post(checkAuth, resetPassword);
router.route("/artist").get(checkAuth, getArtistById); // get specific artist
router.route("/artists").get(checkAuth, getArtists); // get all artist
router.route("/:id/follow").post(checkAuth, followArtist);
router.route("/artist/following").get(checkAuth, followingArtist);

export default router;