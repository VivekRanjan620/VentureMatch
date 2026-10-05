import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/', userRoutes);

export default router;
