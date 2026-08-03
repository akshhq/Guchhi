import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProdEnv = process.env.NODE_ENV === 'production';

/**
 * Every environment variable is validated at startup. Secrets have NO
 * fallback values — a missing secret must fail loudly at boot rather than
 * silently falling back to a well-known development string that would be
 * exploitable if it ever shipped to production.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    API_PREFIX: z.string().min(1).default('/api/v1'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

    // Secrets: required, and must have real entropy (reject short/placeholder values).
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

    COOKIE_DOMAIN: z.string().optional(),

    CLIENT_URL: z.string().url().default('http://localhost:5500'),
    ALLOWED_ORIGINS: z
      .string()
      .default('http://localhost:5500,http://127.0.0.1:5500')
      .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),

    CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
    CLOUDINARY_API_KEY: z.string().optional().default(''),
    CLOUDINARY_API_SECRET: z.string().optional().default(''),

    RAZORPAY_KEY_ID: z.string().optional().default(''),
    RAZORPAY_KEY_SECRET: z.string().optional().default(''),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),

    SMTP_HOST: z.string().optional().default(''),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional().default(''),
    SMTP_PASS: z.string().optional().default(''),
    EMAIL_FROM: z.string().default('Guchhi <no-reply@guchhi.com>'),

    TAX_RATE_PERCENT: z.coerce.number().min(0).max(100).default(5),
    FREE_SHIPPING_THRESHOLD: z.coerce.number().min(0).default(1500),
    FLAT_SHIPPING_RATE: z.coerce.number().min(0).default(99),

    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  })
  .superRefine((value, ctx) => {
    if (!isProdEnv) return;

    const requireInProd = (key: keyof typeof value, label: string) => {
      if (!value[key]) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: `${label} is required in production` });
      }
    };
    requireInProd('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_CLOUD_NAME');
    requireInProd('CLOUDINARY_API_KEY', 'CLOUDINARY_API_KEY');
    requireInProd('CLOUDINARY_API_SECRET', 'CLOUDINARY_API_SECRET');
    requireInProd('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_ID');
    requireInProd('RAZORPAY_KEY_SECRET', 'RAZORPAY_KEY_SECRET');
    requireInProd('RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_WEBHOOK_SECRET');

    if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
      });
    }
    if (value.ALLOWED_ORIGINS.includes('*')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ALLOWED_ORIGINS'],
        message: 'Wildcard CORS origin is not allowed in production',
      });
    }
  });

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    // Deliberately bypass the logger here: it may depend on env in the future,
    // and a boot-time config error must never be silently swallowed.
    // eslint-disable-next-line no-console
    console.error(`\nInvalid environment configuration:\n${details}\n`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProd = env.NODE_ENV === 'production';
