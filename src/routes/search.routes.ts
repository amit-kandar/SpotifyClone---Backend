import express, { Router } from 'express';
import { clearAll, deleteOneSearch, getHistory, search } from '../controllers/search.controller';
import { checkAuth } from '../middlewares/auth.middleware';

const router: Router = express.Router();

router.get('/search', checkAuth, search);

router.get('/', checkAuth, getHistory);

router.delete('/clear-all', checkAuth, clearAll);

router.delete('/:id', checkAuth, deleteOneSearch);

export default router;