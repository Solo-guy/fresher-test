import { Router } from 'express';
import { authGuard } from '../middleware/auth';
import { createTransaction, listTransactions } from '../controllers/transactionController';

const router = Router();

router.use(authGuard);
router.get('/', listTransactions);
router.post('/', createTransaction);

export default router;


