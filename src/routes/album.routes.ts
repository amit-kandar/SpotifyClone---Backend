import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middleware";
import { checkRole } from "../middlewares/permission.middleware";
import {
    addTrackToAlbum,
    createAlbum,
    getAlbumById,
    getAllAlbum,
    likeAlbum,
    removeAlbum,
    removeTrackFromAlbum,
    updateAlbum,
} from "../controllers/album.controller";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

// Create a new album
router.post("/create", checkAuth, checkRole(["admin", "artist"]), upload.single("cover_image"), createAlbum);

// Get all albums
router.get("/", checkAuth, getAllAlbum);

// Get album by ID
router.get("/:id", checkAuth, getAlbumById);

// Add track to an album
router.put("/:id/add-track", checkAuth, checkRole(["admin", "artist"]), addTrackToAlbum);

// Remove track from an album
router.delete("/:id/remove-track", checkAuth, checkRole(["admin", "artist"]), removeTrackFromAlbum);

// Remove an album
router.delete("/:id/remove-album", checkAuth, checkRole(["admin", "artist"]), removeAlbum);

// Like an album
router.post("/:id/like", checkAuth, checkRole(["admin", "artist"]), likeAlbum);

// Update an album
router.put("/:id", checkAuth, checkRole(["admin", "artist"]), updateAlbum);

export default router;
