import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import healthRoutes from './health.routes';
import requirementRoutes from './requirement.routes';
import interestRoutes from './interest.routes';
import connectionRoutes from './connection.routes';
import { InterestController } from '../controllers/interest.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/me/interests', authenticate, InterestController.getMine);
router.use('/', userRoutes);
router.use('/requirements', requirementRoutes);
router.use('/interests', interestRoutes);
router.use('/connections', connectionRoutes);

export default router;
