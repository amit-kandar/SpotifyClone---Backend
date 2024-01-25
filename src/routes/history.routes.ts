import express, { Router } from 'express';

const router: Router = express.Router();

import { checkAuth } from '../middlewares/auth.middleware';
import { addToHistory, clearHistory, deleteOneHistory, getHistory } from '../controllers/history.controller';

router.post('/', checkAuth, addToHistory);
router.get('/', checkAuth, getHistory);
router.delete('/clear-all', checkAuth, clearHistory);
router.delete('/:id', checkAuth, deleteOneHistory);

export default router;