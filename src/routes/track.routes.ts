import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/multer.middleware";
import { addTrack, getAllTracks, getTrack, likeTrack, removeTrack, updateTrack } from "../controllers/track.controller";
import { checkRole } from "../middlewares/permission.middleware";

const router = Router();

// Add a new track
router.post(
    "/add-track",
    checkAuth,
    checkRole(["admin", "artist"]),
    upload.fields([
        { name: "cover_image", maxCount: 1 },
        { name: "track", maxCount: 1 }
    ]),
    addTrack
);

// Get all tracks by artist ID
router.get("/:artistId", checkAuth, getAllTracks);

// Get a specific track by ID
router.get("/:id", checkAuth, getTrack);

// Update a track by ID
router.put("/:id", checkAuth, checkRole(["admin", "artist"]), updateTrack);

// Remove a track by ID
router.delete("/:id/remove", checkAuth, checkRole(["admin", "artist"]), removeTrack);

// Like a track by ID
router.post("/:id/like", checkAuth, likeTrack);

export default router;
