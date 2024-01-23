import { Router } from "express";
import { getTotalFollowers, followArtist, followingArtistByUser } from "../controllers/follow.controller";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

// Follow/Unfollow an artist by ID
router.post("/", checkAuth, followArtist);

// Get artists followed by the current user
router.get("/following", checkAuth, followingArtistByUser);

// Get total followers using artist id
router.get("/:artist_id", getTotalFollowers);

export default router;