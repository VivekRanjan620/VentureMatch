import { Router } from 'express';
import { InterestController } from '../controllers/interest.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.patch('/:id', InterestController.updateStatus);

export default router;
