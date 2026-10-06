import { Router } from 'express';
import { RequirementController } from '../controllers/requirement.controller';
import { InterestController } from '../controllers/interest.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', RequirementController.create);
router.get('/', RequirementController.browse);
router.get('/mine', RequirementController.getMine); // Registered BEFORE /:id
router.get('/:id', RequirementController.getById);
router.patch('/:id', RequirementController.update);

// Interest endpoints on requirements
router.post('/:id/interest', InterestController.create);
router.get('/:id/interests', InterestController.getRequirementInterests);

export default router;
