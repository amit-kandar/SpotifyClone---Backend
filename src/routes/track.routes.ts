import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";
import { addTrack, getAllTracks, getTrack, likeTrack, removeTrack, updateTrack } from "../controllers/track.controller";
import { checkRole } from "../middlewares/permission.middleware";
const router = Router();

router
    .route("/add-track")
    .post(
        checkAuth,
        checkRole(["admin", "artist"]),
        upload.fields([
            { name: "cover_image", maxCount: 1 },
            { name: "track", maxCount: 1 }
        ]),
        addTrack
    )
router.route("/:artistId").get(checkAuth, getAllTracks);
router.route("/:id").get(checkAuth, getTrack);
router.route("/:id").put(checkAuth, checkRole(["admin", "artist"]), updateTrack);
router.route("/:id/remove").delete(checkAuth, checkRole(["admin", "artist"]), removeTrack);
router.route("/:id/like").post(checkAuth, likeTrack);


export default router;