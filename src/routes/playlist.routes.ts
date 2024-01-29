import Router from 'express';
import { checkAuth } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/permission.middleware';
import { upload } from '../middlewares/multer.middleware';
import { addTrackToPlaylist, createPlaylist, getPlaylists, getPlaylist, likePlaylist, removePlaylist, removeTrackFromPlaylist, updatePlaylist, likedPlaylists, addCollaborator, getCollaborators, deleteCollaborator } from '../controllers/playlist.controller';
const router = Router();

// Create a new playlist
router.post("/", checkAuth, checkRole(["admin", "artist", "regular"]), upload.single("cover_image"), createPlaylist);

// Get all playlists
router.get("/", checkAuth, checkRole(["admin", "artist", "regular"]), getPlaylists);

// Get all liked playlists
router.get("/liked", checkAuth, checkRole(["admin", "artist", "regular"]), likedPlaylists);

// Get playlist by ID
router.get("/:id", checkAuth, checkRole(["admin", "artist", "regular"]), getPlaylist);

// Add track to an playlist
router.put("/:id/add-track", checkAuth, checkRole(["admin", "artist", "regular"]), addTrackToPlaylist);

// Remove track from an playlist
router.delete("/:id/remove-track", checkAuth, checkRole(["admin", "artist", "regular"]), removeTrackFromPlaylist);

// Remove an playlist
router.delete("/:id", checkAuth, checkRole(["admin", "artist", "regular"]), removePlaylist);

// Like an playlist
router.post("/:id/like", checkAuth, checkRole(["admin", "artist", "regular"]), likePlaylist);

// Update an playlist
router.put("/:id", checkAuth, checkRole(["admin", "artist", "regular"]), updatePlaylist);

// add collaborator
router.post('/:id/collaborator', checkAuth, checkRole(["admin", "artist", "regular"]), addCollaborator);

// get collaborators
router.get('/:id/collaborator', checkAuth, checkRole(["admin", "artist", "regular"]), getCollaborators);

// delete collaborator
router.delete('/:id/collaborator', checkAuth, checkRole(["admin", "artist", "regular"]), deleteCollaborator);

export default router;