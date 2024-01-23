import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";
import { addTrack, getTrack, getTracks, deleteTrack, updateTrack, likeUnlikeTrack } from "../controllers/track.controller";
import { checkRole } from "../middlewares/permission.middleware";

const router = Router();

// Add a new track
router.post(
    "/",
    checkAuth,
    checkRole(["admin", "artist"]),
    upload.fields([
        { name: "cover_image", maxCount: 1 },
        { name: "track", maxCount: 1 }
    ]),
    addTrack
);

// Get all tracks of a artist
router.get("/", checkAuth, checkRole(["admin", "artist", "regular"]), getTracks);

// Get a specific track by ID
router.get("/:id", checkAuth, checkRole(["admin", "artist", "regular"]), getTrack);

// Update a track by ID
router.put("/:id", checkAuth, checkRole(["admin", "artist"]), updateTrack);

// Remove a track by ID
router.delete("/:id", checkAuth, checkRole(["admin", "artist"]), deleteTrack);

// Like a track by ID
router.post("/:id/like", checkAuth, likeUnlikeTrack);

export default router;
