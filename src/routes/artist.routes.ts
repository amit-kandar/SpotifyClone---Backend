import { Router } from "express";
import { createArtist, getArtist, getArtists, likeUnlikeArtist, updateArtist } from "../controllers/artist.controller";
import { checkRole } from "../middlewares/permission.middleware";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

// Create Artist Profile
router.post("/", checkAuth, checkRole(["admin", "regular"]), createArtist);

// Get list of all artists
router.get("/", checkAuth, checkRole(["admin", "regular", "artist"]), getArtists);

// Get information about a specific artist by ID
router.get("/:id", checkAuth, checkRole(["admin", "regular", "artist"]), getArtist);

// Update Artist Profile
router.put("/:id", checkAuth, checkRole(["admin", "artist"]), updateArtist);

// Like/Unlike an artist by ID
router.post("/:id/like", checkAuth, checkRole(["admin", "artist", "regular"]), likeUnlikeArtist);

export default router;
