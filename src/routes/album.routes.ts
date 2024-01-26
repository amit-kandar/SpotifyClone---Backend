import { Router } from "express";
import { checkAuth } from "../middlewares/auth.middleware";
import { checkRole } from "../middlewares/permission.middleware";
import {
    addTrackToAlbum,
    createAlbum,
    getAlbum,
    getAlbums,
    likeUnlikeAlbum,
    likedAlbum,
    removeAlbum,
    removeTrackFromAlbum,
    updateAlbum,
} from "../controllers/album.controller";
import { upload } from "../middlewares/multer.middleware";

const router = Router();

// Create a new album
router.post("/", checkAuth, checkRole(["admin", "artist"]), upload.single("cover_image"), createAlbum);

// Get all albums
router.get("/", checkAuth, checkRole(["admin", "artist", "regular"]), getAlbums);

// Get liked albums
router.get("/liked", checkAuth, checkRole(["admin", "artist", "regular"]), likedAlbum);

// Get album by ID
router.get("/:id", checkAuth, checkRole(["admin", "artist", "regular"]), getAlbum);

// Update an album
router.put("/:id", checkAuth, checkRole(["admin", "artist"]), updateAlbum);

// Remove an album
router.delete("/:id", checkAuth, checkRole(["admin", "artist"]), removeAlbum);

// Add track to an album
router.put("/:id/add-track", checkAuth, checkRole(["admin", "artist"]), addTrackToAlbum);

// Remove track from an album
router.delete("/:id/remove-track", checkAuth, checkRole(["admin", "artist"]), removeTrackFromAlbum);

// Like an album
router.post("/:id/like", checkAuth, checkRole(["admin", "artist"]), likeUnlikeAlbum);

export default router;
