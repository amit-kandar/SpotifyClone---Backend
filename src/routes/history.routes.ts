import express, { Router } from 'express';

const router: Router = express.Router();

import { checkAuth } from '../middlewares/auth.middleware';
import { addToHistory, clearHistory, deleteOneHistory, getHistory } from '../controllers/history.controller';
import { checkRole } from '../middlewares/permission.middleware';

router.post('/', checkAuth, checkRole(["admin", "artist", "regular"]), addToHistory);
router.get('/', checkAuth, checkRole(["admin", "artist", "regular"]), getHistory);
router.delete('/clear-all', checkAuth, checkRole(["admin", "artist", "regular"]), clearHistory);
router.delete('/:id', checkAuth, checkRole(["admin", "artist", "regular"]), deleteOneHistory);

export default router;