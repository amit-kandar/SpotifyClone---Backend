import { Router } from "express";
import { signin, signout, signup } from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

router.route("/signup").post(upload.single("avatar"), signup);
router.route("/signin").post(signin);

// Secured Routes
router.route("/logout").get(checkAuth, signout);

export default router;