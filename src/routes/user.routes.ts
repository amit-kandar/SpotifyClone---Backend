import { Router } from "express";
import { signup } from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

router.route("/signup").post(upload.single("avatar"), signup)


export default router;