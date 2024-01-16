import express, { Router } from 'express';

const router: Router = express.Router();

import { clearAll, deleteOneSearch, getHistory, search } from '../controllers/search.controller';
import { checkAuth } from '../middlewares/auth.middleware';

// Define routes
router.get('/search', checkAuth, search);

router.get('/history', checkAuth, getHistory);

router.delete('/clearall', checkAuth, clearAll);

router.delete('/:id', checkAuth, deleteOneSearch);

export default router;