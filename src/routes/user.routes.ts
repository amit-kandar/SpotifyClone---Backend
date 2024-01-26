import { Router } from "express";
import {
    changeAvatar,
    changePassword,
    checkEmail,
    getAccessTokenByRefreshToken,
    getUserDetails,
    resetPassword,
    signin,
    signout,
    signup,
    updateUserDetails,
} from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { checkAuth } from "../middlewares/auth.middleware";
import { checkRole } from "../middlewares/permission.middleware";

const router = Router();

// Public Routes

// Route for user signup
router.post("/signup", upload.single("avatar"), signup);

// Route for user signin
router.post("/signin", signin);

// Route for checking if email exists
router.post("/check-email", checkEmail);

// Secured Routes

// Route for user signout
router.get("/signout", checkAuth, signout);

// Route for refreshing access token
router.post("/refresh-token", getAccessTokenByRefreshToken);

// Route for getting user details
router.get("/fetch-user", checkAuth, checkRole(["admin", "artist", "regular"]), getUserDetails);

// Route for updating user details
router.put("/update-user", checkAuth, checkRole(["admin", "artist", "regular"]), updateUserDetails);

// Route for changing user avatar
router.put("/change-avatar", checkAuth, checkRole(["admin", "artist", "regular"]), upload.single("avatar"), changeAvatar);

// Route for changing user password
router.put("/change-password", checkAuth, checkRole(["admin", "artist", "regular"]), changePassword);

// Route for resetting user password
router.post("/reset-password", checkAuth, checkRole(["admin", "artist", "regular"]), resetPassword);

export default router;
