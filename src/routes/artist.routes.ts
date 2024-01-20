import { Router } from "express";
import { createArtistProfile, getArtist, getArtists, updateArtist } from "../controllers/artist.controller";
import { checkRole } from "../middlewares/permission.middleware";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

// Create Artist Profile
router.post("/", checkAuth, checkRole(["admin", "regular"]), createArtistProfile);

// Get list of all artists
router.get("/", checkAuth, getArtists);

// Update Artist Profile
router.put("/:id", checkAuth, checkRole(["admin", "artist"]), updateArtist);

// Get information about a specific artist by ID (This should come after other specific routes)
router.get("/:id", checkAuth, getArtist);

export default router;
