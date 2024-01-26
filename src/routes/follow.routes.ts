import { Router } from "express";
import { getTotalFollowers, followArtist, followingArtistByUser } from "../controllers/follow.controller";
import { checkAuth } from "../middlewares/auth.middleware";
import { checkRole } from "../middlewares/permission.middleware";

const router = Router();

// Follow/Unfollow an artist by ID
router.post("/", checkAuth, checkRole(["admin", "artist", "regular"]), followArtist);

// Get artists followed by the current user
router.get("/following", checkAuth, checkRole(["admin", "artist", "regular"]), followingArtistByUser);

// Get total followers using artist id
router.get("/:artist_id", checkAuth, checkRole(["admin", "artist", "regular"]), getTotalFollowers);

export default router;