import { z } from 'zod';

export const enquirySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').max(120),
    email: z.string().email('Invalid email address'),
    phone: z.string().max(20).optional(),
    company: z.string().max(160).optional(),
    message: z.string().min(1, 'Message is required').max(2000),
    // Honeypot field: real users never fill this in (it's visually hidden on
    // the frontend). Any non-empty value here means a bot filled every field
    // it could find — reject silently-ish rather than spending an SMTP send
    // and a DB-free round trip on it.
    website: z.string().max(0, 'Spam detected').optional(),
  }),
});
