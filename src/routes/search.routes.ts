import express, { Router } from 'express';
import { clearAll, deleteOneSearch, getHistory, search } from '../controllers/search.controller';
import { checkAuth } from '../middlewares/auth.middleware';
import { checkRole } from '../middlewares/permission.middleware';

const router: Router = express.Router();

router.get('/search', checkAuth, checkRole(["admin", "artist", "regular"]), search);

router.get('/', checkAuth, checkRole(["admin", "artist", "regular"]), getHistory);

router.delete('/clear-all', checkAuth, checkRole(["admin", "artist", "regular"]), clearAll);

router.delete('/:id', checkAuth, checkRole(["admin", "artist", "regular"]), deleteOneSearch);

export default router;