import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { InterestController } from '../controllers/interest.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/me/counts', authenticate, UserController.getCounts);
router.get('/me/received-interests', authenticate, InterestController.getReceived);
router.get('/me', authenticate, UserController.getMe);
router.put('/me', authenticate, UserController.updateProfile);
router.get('/me/commitment', authenticate, UserController.getCommitment);
router.put('/me/commitment', authenticate, UserController.updateCommitment);
router.post('/me/verification/linkedin', authenticate, UserController.verifyLinkedin);

export default router;
