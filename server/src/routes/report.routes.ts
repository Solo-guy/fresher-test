import { Router } from 'express';
import { authGuard } from '../middleware/auth';
import { exportStatement, getStatement } from '../controllers/reportController';

const router = Router();

router.use(authGuard);
router.get('/statement', getStatement);
router.get('/statement/export', exportStatement);

export default router;


