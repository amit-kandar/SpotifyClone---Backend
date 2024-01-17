import express, { Router } from 'express';

const router: Router = express.Router();

import { checkAuth } from '../middlewares/auth.middleware';
import { addToHistory, clearHistory, getHistory } from '../controllers/history.controller';

router.post('/add', checkAuth, addToHistory);
router.get('/all-history', checkAuth, getHistory);
router.delete('/clear-all', checkAuth, clearHistory);

export default router;