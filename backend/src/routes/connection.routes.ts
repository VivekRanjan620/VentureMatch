import { Router } from 'express';
import { ConnectionController } from '../controllers/connection.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', ConnectionController.getAll);
router.get('/:id', ConnectionController.getById);
router.post('/:id/share-contact', ConnectionController.shareContact);

export default router;
