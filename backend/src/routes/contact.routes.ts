import { Router } from 'express';
import * as ContactController from '../controllers/contact.controller';
import { validate } from '../middlewares/validate';
import { contactLimiter } from '../middlewares/rateLimiter';
import { enquirySchema } from '../validators/contact.validator';

const router = Router();

router.post('/enquiry', contactLimiter, validate(enquirySchema), ContactController.submitEnquiry);

export default router;
