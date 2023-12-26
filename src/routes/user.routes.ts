import { Router } from "express";
import { checkEmail, getAccessTokenByRefreshToken, signin, signout, signup } from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

router.route("/signup").post(upload.single("avatar"), signup);
router.route("/signin").post(signin);
router.route("/check-email").post(checkEmail);

// Secured Routes
router.route("/signout").get(checkAuth, signout);
router.route("/refresh-token").post(getAccessTokenByRefreshToken)

export default router;