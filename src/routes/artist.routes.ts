import { Router } from "express";
import { createArtist, getArtist, getArtists, updateArtist } from "../controllers/artist.controller";
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

export default router;
