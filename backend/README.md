# Guchhi Backend

Production-ready REST API for **Guchhi** — a premium Himalayan wild-foraged food ecommerce
platform. Built to sit behind the existing plain HTML/CSS/JavaScript frontend with **zero
changes to the frontend's architecture** — only its API base URL needs to change.

---

## Tech Stack

| Concern            | Choice |
|---------------------|--------|
| Runtime             | Node.js 20 LTS + TypeScript |
| Framework           | Express.js |
| Database            | PostgreSQL 16 (via Prisma ORM) |
| Cache / ephemeral state | Redis (checkout sessions, rate limiting) |
| Auth                | JWT access tokens + rotating opaque refresh tokens |
| Image storage       | Cloudinary |
| Payments            | Razorpay (Orders API + signature verification) |
| Email               | Nodemailer (SMTP) |
| Validation          | Zod |
| Docs                | Swagger / OpenAPI 3 (`/api-docs`) |
| Security            | Helmet, CORS, HPP, express-rate-limit |
| Logging             | Winston (app logs) + Morgan (HTTP access logs) |
| Containerization     | Docker + Docker Compose |
| CI                  | GitHub Actions |

Why PostgreSQL over MongoDB: orders/payments/inventory need ACID transactions and strict
relational integrity (an order line item must reference a real product and a real order;
stock must never go negative). Prisma models this cleanly and migrates safely.

---

## Project Structure

```
src/
  config/        # env, db (Prisma client), redis, cloudinary, razorpay
  controllers/   # thin HTTP layer — parse req, call service, shape response
  services/      # business logic (the bulk of the app)
  repositories/  # (Prisma itself acts as the repository layer via services;
                 #  see "Architecture notes" below)
  routes/        # route wiring, incl. routes/admin/* for admin-only endpoints
  middlewares/   # auth, validation, rate limiting, error handling, uploads
  validators/    # Zod schemas per module
  emails/        # nodemailer transport + HTML templates
  utils/         # ApiError, ApiResponse, JWT helpers, pagination, logger
  docs/          # swagger.ts
  jobs/          # place for scheduled tasks (low-stock digest, cart cleanup, etc.)
  app.ts         # Express app assembly (middleware + routes)
  server.ts      # process entrypoint, graceful shutdown
prisma/
  schema.prisma  # full relational data model
  seed.ts        # seeds an admin user, categories, sample products, a coupon
```

### Architecture notes

- **Controllers → Services → Prisma.** Prisma's generated client already gives a
  type-safe, injectable data-access layer, so services call `prisma.*` directly rather than
  wrapping every model in a hand-written repository class — this avoids a redundant layer
  while keeping business logic (services) cleanly separated from HTTP concerns (controllers).
  If you want a stricter repository seam (e.g. to swap persistence later), add
  `src/repositories/*.repository.ts` files that wrap the relevant `prisma.*` calls and have
  services depend on those instead.
- **Consistent response envelope** everywhere: `{ success, message, data }` on success,
  `{ success, message, errors }` on failure (see `utils/ApiResponse.ts` / `ApiError.ts`).
- **Guest + logged-in cart** share one implementation (`cart.service.ts`) keyed by either
  `userId` or a client-generated `x-guest-id` header; carts merge automatically on login/signup.

---

## Payment Flow (Razorpay) — exactly as specified

```
Frontend: POST /api/checkout/create-order   (cart + address + optional coupon)
   → Backend computes totals, creates a Razorpay Order, stores a short-lived
     "checkout snapshot" in Redis (30 min TTL), returns { checkoutId, razorpayOrderId, amount, keyId }
Frontend: opens Razorpay Checkout with that order id
   → user completes payment
Frontend: POST /api/checkout/verify-payment { checkoutId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
   → Backend NEVER trusts the frontend's "success" claim. It recomputes the HMAC-SHA256
     signature from (razorpay_order_id|razorpay_payment_id) using RAZORPAY_KEY_SECRET and
     compares it to what the frontend sent. Only on a match does it proceed.
   → Inside one DB transaction: re-checks stock, creates the Order + OrderItems,
     decrements stock (guarded against races via a conditional `stock >= qty` update),
     writes the Payment row as PAID, clears the cart, redeems the coupon, and fires
     confirmation emails.
```

A Cash-on-Delivery path (`POST /api/checkout/cod-order`) is also available and skips the
Razorpay steps, creating a `CONFIRMED` order with `Payment.status = PENDING`.

---

## Data Model (ER overview)

```mermaid
erDiagram
  User ||--o{ Address : has
  User ||--o| Cart : has
  User ||--o{ Order : places
  User ||--o{ Review : writes
  User ||--o{ Wishlist : saves
  User ||--o{ RefreshToken : owns

  Category ||--o{ Product : contains
  Product ||--o{ ProductImage : has
  Product ||--o{ CartItem : "in"
  Product ||--o{ OrderItem : "in"
  Product ||--o{ Review : receives
  Product ||--o{ InventoryLog : logs

  Cart ||--o{ CartItem : contains
  Cart }o--o| Coupon : "may apply"

  Order ||--o{ OrderItem : contains
  Order ||--|| Payment : has
  Order ||--o{ OrderStatusHistory : tracks
  Order }o--o| Coupon : "may apply"
  Order }o--o| Address : "ships to / bills to"

  Coupon ||--o{ CouponRedemption : "redeemed via"
```

Full field-level definitions live in `prisma/schema.prisma` (single source of truth).

---

## Setup Guide

### 1. Prerequisites
- Node.js ≥ 20
- Docker + Docker Compose (recommended), or a local PostgreSQL 16 + Redis 7

### 2. Configure environment
```bash
cp .env.example .env
# fill in DATABASE_URL / REDIS_URL (if not using docker-compose defaults),
# JWT secrets, Cloudinary, Razorpay, and SMTP credentials
```

### 3. Install & generate the Prisma client
```bash
npm install
npx prisma generate
```
> Note: `prisma generate` downloads a small query-engine binary from
> `binaries.prisma.sh` on first run — make sure that host isn't blocked by your
> network/firewall (this only affects `generate`/`install`, not runtime).

### 4a. Fastest path — everything in Docker
```bash
docker compose up -d --build
# runs migrations automatically, then starts the API on :4000
```

### 4b. Local dev with hot reload (DB/Redis in Docker, API on host)
```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis only
npx prisma migrate dev                            # create tables
npm run prisma:seed                               # optional: sample data + admin user
npm run dev                                        # tsx watch, http://localhost:4000
```

Seeded admin login: `admin@guchhi.com` / `Admin@12345` — **change this immediately** in
any non-local environment.

### 5. Explore the API
- Swagger UI: `http://localhost:4000/api-docs`
- Health check: `GET http://localhost:4000/api/v1/health` (checks DB + Redis connectivity;
  the `/v1` comes from the default `API_PREFIX` in `.env.example` — adjust if you changed it)

---

## Connecting the existing frontend

The frontend already talks to this API for real — see the root `README.md` and
`js/services/{authService,cartService,checkoutService,productService}.js` and
`js/services/apiClient.js`. In short:

- Base URL defaults to `http://localhost:4000/api/v1` on the frontend side
  (`apiClient.js::API_BASE_URL`), matching this backend's own default `API_PREFIX`.
- `Authorization: Bearer <accessToken>` is sent automatically once logged in, and
  `apiClient.js` transparently calls `POST /api/v1/auth/refresh-token` and retries on a
  `401` before giving up — no per-call code needed for that.
- For guest shopping, the frontend generates and persists a UUID in `localStorage` and
  sends it as `x-guest-id` on cart/checkout requests. It's dropped automatically once the
  guest logs in or signs up (their cart is merged — see `CartService.mergeGuestCart`,
  called from both `signup` and `login` in `auth.controller.ts`).
- Refresh tokens are delivered as an `httpOnly` cookie scoped to `${API_PREFIX}/auth`
  (i.e. `/api/v1/auth` by default — **not** a hardcoded `/api/auth`; the cookie path is
  derived from `env.API_PREFIX` in `auth.controller.ts` specifically so it can't drift out
  of sync if the API version changes). No frontend code needs to read this cookie directly.

---

## API Endpoint Overview

All routes are prefixed with `API_PREFIX` (`/api/v1` by default), **except** the Razorpay
webhook, which is intentionally kept outside versioning since a webhook URL configured in
the Razorpay dashboard should stay stable across API versions.

| Module | Base path | Highlights |
|---|---|---|
| Auth | `/auth` | signup, login, logout, refresh-token, forgot/reset-password, verify-email, change-password, me |
| Categories | `/categories` | public list/get; admin CRUD |
| Products | `/products` | list (search/filter/sort/paginate), featured, related, slug lookup; admin CRUD + image upload |
| Cart | `/cart` | get, add/update/remove item, clear, apply/remove coupon (guest + user) |
| Checkout | `/checkout` | summary, create-order (Razorpay), verify-payment, cod-order |
| Orders | `/orders` | my orders, get one, cancel, invoice; `/admin/orders` for status management |
| Reviews | `/reviews` | list per product, submit (verified-purchase aware); admin moderation queue |
| Wishlist | `/wishlist` | list, add, remove, move-to-cart |
| Addresses | `/addresses` | CRUD for a logged-in user's saved addresses |
| Admin | `/admin/*` | dashboard, sales analytics, top products, customers, coupons, inventory (low-stock, logs, adjustments) |
| Webhooks | `/webhooks/razorpay` (unversioned, mounted directly on the app) | Razorpay payment webhook — HMAC-verified against the raw request body |

Full request/response contracts (including Zod-validated bodies) are in Swagger at
`/api-docs`, and readable directly in `src/validators/*.ts` and `src/routes/**/*.ts`.

---

## Deployment Guide

1. **Build the image**: `docker build --target production -t guchhi-backend .`
2. **Provision** managed PostgreSQL + Redis (e.g. Render/Railway/RDS + Elasticache), set
   `DATABASE_URL` / `REDIS_URL` accordingly.
3. **Run migrations** as a release step: `npx prisma migrate deploy`.
4. **Set environment variables** from `.env.example` in your host's secret manager —
   especially `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_KEY_SECRET`.
5. **Point `ALLOWED_ORIGINS`** at the production frontend origin(s).
6. **Health check**: configure your platform's health check against `GET /api/v1/health`
   (checks DB + Redis connectivity, returns `503` if either is down).
7. **CI**: `.github/workflows/ci.yml` installs deps, generates the Prisma client, runs
   migrations against an ephemeral Postgres service, lints, builds, and builds the Docker
   image on every push/PR. Wire a deploy job on top of it for your target platform.

---

## Testing

`src/__tests__/` has Vitest + Supertest integration tests covering:
- The checkout flow: COD happy path (stock decrement, cart clearing), oversell rejection,
  guest-checkout email requirement, coupon discount math, Razorpay signature
  verification (including rejecting a forged signature and rejecting a replayed
  `verify-payment` call).
- Guest-cart merge on login (including capping the merged quantity at real stock rather
  than overselling) and coupon edge cases (unknown code, below minimum order value,
  expired, per-user usage limit already reached, percentage discount capped at
  `maxDiscountAmount`).

They run against a real, disposable Postgres database — never point them at dev or prod
data, since the test setup truncates tables between tests. One-time setup:

```bash
createdb guchhi_test
npx prisma generate
DATABASE_URL=postgresql://guchhi:guchhi@localhost:5432/guchhi_test npx prisma migrate deploy
```

Then: `npm test` (or `npm run test:watch`). `src/__tests__/helpers/setupEnv.ts` forces
`DATABASE_URL` to a `_test`-suffixed database as a safety net even if `.env` isn't pointed
there directly.

---

## Security Checklist (implemented)

- Helmet security headers, HPP (HTTP parameter pollution) protection, CORS allow-list
- express-rate-limit (global + stricter auth/OTP limiters)
- All bodies/queries/params validated with Zod before hitting a controller
- Passwords hashed with bcrypt (cost 12); refresh tokens stored only as SHA-256 hashes
- Razorpay payments verified server-side via HMAC signature — the frontend's claim of
  "payment succeeded" is never trusted on its own
- Role-based authorization on every admin/inventory/support route
- Audit log on sensitive admin mutations (product/category/coupon/order-status changes)
- Centralized error handler that never leaks stack traces in production

---

## Extending Toward the Roadmap

The schema and module boundaries were chosen so these can be added without breaking
existing consumers:

- **Product variants** — add a `ProductVariant` model FK'd to `Product`; `CartItem`/`OrderItem`
  gain an optional `variantId`.
- **GST invoicing / multi-warehouse / inventory forecasting** — `InventoryLog` already
  captures a full movement ledger per product to build on.
- **Loyalty points / gift cards / subscriptions** — additive models keyed off `User`/`Order`.
- **GraphQL layer** — can be mounted alongside the REST routes in `app.ts` without touching
  services, since business logic already lives outside the controllers.
- **Multi-language** — add a `locale` column to translatable models, or a side-table
  (`ProductTranslation`) if you need it per-field.

---

## License

Proprietary — internal project for Guchhi.
