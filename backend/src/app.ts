import express, { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env, isProd } from './config/env';
import { logger } from './utils/logger';
import { globalLimiter } from './middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { swaggerSpec } from './docs/swagger';
import webhookRoutes from './routes/webhook.routes';
import routes from './routes';

const app: Application = express();

// ---- Security & core middleware ----
app.set('trust proxy', 1);
// Hide the framework fingerprint (Express sets this header by default).
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // This is a JSON API — it never serves its own HTML/CSS/JS to a
        // browser, so there's no reason to allow inline scripts/styles or
        // any remote script origins here. Swagger UI is the one exception
        // (served from this same app) and needs 'unsafe-inline' for its
        // bundled styles; scope that loosening to /api-docs only.
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
    hsts: {
      maxAge: 31_536_000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);
// Swagger UI's bundled assets need inline styles; relax CSP for that route only.
app.use(
  '/api-docs',
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  })
);

const allowedOriginSet = new Set(env.ALLOWED_ORIGINS);
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin request, a server-to-server call, or
      // a non-browser client (curl/Postman/mobile app) — none of those are
      // subject to CORS in the first place, so allow them through.
      if (!origin || allowedOriginSet.has(origin)) {
        return callback(null, true);
      }
      logger.warn('Blocked CORS request from disallowed origin', { origin });
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(hpp());
app.use(compression());

// ---- Razorpay webhook: needs the exact raw bytes for signature
// verification, so it's mounted with a raw-body parser BEFORE the global
// JSON parser below (which would otherwise consume and reserialize the
// body, breaking the HMAC check). Kept outside API_PREFIX/versioning since
// the Razorpay dashboard webhook URL should stay stable across API versions.
app.use(
  '/webhooks',
  express.raw({ type: 'application/json', limit: '1mb' }),
  (req: Request, _res: Response, next: NextFunction) => {
    (req as any).rawBody = req.body;
    next();
  },
  webhookRoutes
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// ---- Logging ----
app.use(
  morgan(isProd ? 'combined' : 'dev', {
    stream: { write: (msg: string) => logger.info(msg.trim()) },
  })
);

// ---- Rate limiting ----
app.use(env.API_PREFIX, globalLimiter);

// ---- API docs ----
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ---- Routes ----
app.use(env.API_PREFIX, routes);

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Guchhi API is running', docs: '/api-docs' });
});

// ---- 404 & error handling (must be last) ----
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
