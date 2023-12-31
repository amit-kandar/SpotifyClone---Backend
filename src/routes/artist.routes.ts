import { Router } from "express";
import { createArtistProfile, getArtistById, getALlArtists, updateArtistProfile, followArtist, followingArtistByUser } from "../controllers/artist.controller";
import { checkRole } from "../middlewares/permission.middleware";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

router.route("/create").post(checkAuth, checkRole(["admin", "regular"]), createArtistProfile);
router.route("/following-artists").get(checkAuth, followingArtistByUser);
router.route("/").get(checkAuth, getALlArtists);
router.route("/:id").put(checkAuth, checkRole(["admin", "artist"]), updateArtistProfile);
router.route("/:id").get(checkAuth, getArtistById);
router.route("/:id/follow").post(checkAuth, followArtist);

export default router;