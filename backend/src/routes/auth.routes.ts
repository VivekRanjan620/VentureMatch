import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/refresh', authRateLimiter, AuthController.refresh);
router.post('/logout', AuthController.logout);

export default router;
