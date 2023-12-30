import { Router } from "express";
import { createArtistProfile, updateArtistProfile } from "../controllers/artist.controller";
import { checkRole } from "../middlewares/permission.middleware";
import { checkAuth } from "../middlewares/auth.middleware";

const router = Router();

router.route("/create").post(checkAuth, checkRole(["admin", "regular"]), createArtistProfile);

router.route("/:id").put(checkAuth, checkRole(["admin", "artist"]), updateArtistProfile);



export default router;