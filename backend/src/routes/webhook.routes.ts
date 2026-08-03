import { Router } from 'express';
import { handleRazorpayWebhook } from '../controllers/webhook.controller';

const router = Router();

// NOTE: this route needs the raw request body (see app.ts), not the
// globally JSON-parsed body, so the HMAC signature check has the exact
// bytes Razorpay signed.
router.post('/razorpay', handleRazorpayWebhook);

export default router;
