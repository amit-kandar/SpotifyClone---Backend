import { Router } from "express";
import { createArtistProfile, getArtistById, getAllArtists, updateArtistProfile, followArtist, followingArtistByUser, likeArtist, getTotalFollowers } from "../controllers/artist.controller";
import { checkRole } from "../middlewares/permission.middleware";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

// Create Artist Profile
router.post("/create", checkAuth, checkRole(["admin", "regular"]), createArtistProfile);

// Get list of all artists
router.get("/", checkAuth, getAllArtists);

// Follow/Unfollow an artist by ID
router.post("/:id/follow", checkAuth, followArtist);

// Get artists followed by the current user
router.get("/following-artists", checkAuth, followingArtistByUser);

// Like/Unlike an artist by ID
router.post("/:id/like", checkAuth, checkRole(["admin", "artist", "regular"]), likeArtist);

// Update Artist Profile
router.put("/:id", checkAuth, checkRole(["admin", "artist"]), updateArtistProfile);

// Get information about a specific artist by ID (This should come after other specific routes)
router.get("/:id", checkAuth, getArtistById);

// Get total followers using artist id
router.get("/total-follower/:id", getTotalFollowers);

export default router;
