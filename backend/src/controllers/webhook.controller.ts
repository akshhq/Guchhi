import { Request, Response } from 'express';
import crypto from 'crypto';
import { env } from '../config/env';
import { CheckoutService } from '../services/checkout.service';
import { logger } from '../utils/logger';

/**
 * Verifies `x-razorpay-signature` against the raw request body using the
 * dashboard-configured webhook secret. This MUST run against the raw bytes
 * Razorpay sent — not a re-serialized JSON object — or the HMAC will never
 * match. See app.ts for where the raw body is captured for this one route.
 */
function isValidWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!signature || !env.RAZORPAY_WEBHOOK_SECRET) return false;

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function handleRazorpayWebhook(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const rawBody: Buffer | undefined = (req as any).rawBody;

  if (!rawBody || !isValidWebhookSignature(rawBody, signature)) {
    logger.warn('Razorpay webhook: invalid signature, rejecting', {
      hasRawBody: Boolean(rawBody),
      hasSignatureHeader: Boolean(signature),
    });
    // Deliberately generic — never reveal *why* verification failed to the caller.
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Malformed webhook payload' });
  }

  try {
    const result = await CheckoutService.handleRazorpayWebhookEvent(event);
    logger.info('Razorpay webhook processed', { event: event?.event, ...result });
    // Always 200 once the signature is valid and we've handled (or deliberately
    // ignored) the event — a non-2xx makes Razorpay retry indefinitely.
    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Razorpay webhook processing failed', { error: (err as Error).message });
    // Still surface as a 500 here so Razorpay retries a *real* processing failure
    // (e.g. a transient DB outage), as opposed to the invalid-signature case above.
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
}
