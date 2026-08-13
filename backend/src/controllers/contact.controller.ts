import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { sendSuccess } from '../utils/ApiResponse';
import { sendMail } from '../emails/mailer';
import { tradeEnquiryNotification, tradeEnquiryConfirmation } from '../emails/templates';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const submitEnquiry = catchAsync(async (req: Request, res: Response) => {
  const { name, email, phone, company, message, website } = req.body;

  // Honeypot tripped — pretend success so a bot doesn't learn to adapt, but
  // never actually send the email.
  if (website) {
    logger.warn('Contact form honeypot triggered', { email });
    return sendSuccess(res, {}, 'Thanks — we\'ll be in touch shortly.');
  }

  await sendMail(env.CONTACT_NOTIFY_EMAIL, `Trade Enquiry from ${name}`, tradeEnquiryNotification({
    name,
    email,
    phone,
    company,
    message,
  }));

  // Best-effort confirmation to the sender — doesn't block/fail the request
  // if their address happens to reject it.
  sendMail(email, "We've received your enquiry — Guchhi", tradeEnquiryConfirmation(name)).catch(() => {});

  sendSuccess(res, {}, "Thanks — we've received your enquiry and will be in touch shortly.");
});
