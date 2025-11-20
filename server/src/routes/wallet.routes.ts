import { Router } from 'express';
import { authGuard } from '../middleware/auth';
import { createWallet, listWallets } from '../controllers/walletController';

const router = Router();

router.use(authGuard);
router.get('/', listWallets);
router.post('/', createWallet);

export default router;


