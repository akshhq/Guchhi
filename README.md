# Guchhi — Full Stack

Premium Himalayan wild-foraged food ecommerce site: a static HTML/CSS/vanilla-JS frontend
backed by a real Node/Express/TypeScript/Prisma/PostgreSQL API.

```
guchhi-fullstack/
  index.html, checkout.html, products/*.html   # pages
  js/                                           # frontend source (see below)
  styles.css
  media/                                        # images, 3D model
  backend/                                       # API — see backend/README.md for full detail
```

There is no `frontend/` subfolder — the site's HTML/CSS/JS lives directly at the repo root,
alongside `backend/`.

## Current status

The frontend is **fully wired to the real backend**, not running on placeholder/local-only
logic:

- **Auth** (`js/services/authService.js`, `js/account/accountUI.js`) — real signup/login/
  logout/forgot-password against the backend, with a slide-in account panel on every page.
  Access tokens auto-refresh in the background (`js/services/apiClient.js`) so a session
  doesn't die every 15 minutes.
- **Cart** (`js/services/cartService.js`, `js/cart/cartUI.js`) — cart state lives in
  `localStorage` for instant add/remove with no network round-trip, then syncs to the
  backend's cart automatically the moment checkout starts
  (`js/services/checkoutService.js::syncServerCart`).
- **Coupons** (cart sidebar + checkout) — real calls to the backend's coupon endpoints.
  Expiry, minimum order value, and per-user usage limits are enforced server-side
  (`backend/src/services/coupon.service.ts`); the frontend just surfaces whatever the
  server decides.
- **Checkout** (`js/checkout/checkoutFlow.js`) — both the Razorpay flow (create-order →
  pay → verify-payment) and Cash-on-Delivery talk to the real backend.
- **Products** — product pages still render from the local catalog (`js/data/products.js`)
  for content/copy, but checkout resolves each line to its real backend product by slug
  before creating an order (`js/services/productService.js::resolveBackendProductBySlug`).

## Quick start (running both halves locally)

1. **Backend** — follow `backend/README.md` in full (env setup, Docker Compose, migrations,
   seed data). It boots the API at `http://localhost:4000`, with routes under `/api/v1` and
   Swagger docs at `/api-docs`.

2. **Frontend** — it's fully static, so any static server works:
   ```bash
   npx serve -l 5500 .
   # or: python3 -m http.server 5500
   ```
   Open `http://localhost:5500`.

3. **Point the frontend at the backend** — `js/services/apiClient.js` defaults to
   `http://localhost:4000/api/v1`, which matches the backend's own default
   (`API_PREFIX=/api/v1` in `.env.example`). If you change one, change the other — either
   `API_BASE_URL` in `apiClient.js`, or set `window.GUCHHI_API_BASE_URL` in an inline
   `<script>` before `main.js` loads.

4. **CORS** — `backend/.env.example`'s `ALLOWED_ORIGINS` / `CLIENT_URL` must match wherever
   you serve the frontend from (`http://localhost:5500` by default). The backend rejects
   cross-origin requests from anywhere not on that list.

Guest carts are identified by a UUID the frontend generates and persists in `localStorage`
(`apiClient.js::getGuestId`), sent as `x-guest-id`. It merges into the real cart automatically
the moment a guest logs in or signs up (`backend/src/controllers/auth.controller.ts`).

## Known environment caveat

Generating the Prisma client (`npx prisma generate`, also run automatically by
`npm install` via a `postinstall` hook) downloads a small query-engine binary from
`binaries.prisma.sh`. If you're behind a restrictive firewall/proxy that blocks that host,
`npm install`/`prisma generate` will fail even though everything else works — this only
affects that one step, not runtime behavior once the client is generated somewhere unblocked.

## Testing

`backend/src/__tests__/` has integration tests (Vitest + Supertest) covering the checkout
flow (COD orders, stock guards, coupon math, Razorpay signature verification/replay
protection) and cart-merge-on-login. They run against a real disposable Postgres database —
see the header comment in `backend/src/__tests__/helpers/setupEnv.ts` for the one-time setup,
then `cd backend && npm test`.

## Notable frontend details

- `js/animations/backgroundMushroom.js` — a subtle rotating 3D mushroom model rendered
  behind every section except the hero, at low opacity (`TARGET_OPACITY`, currently `0.06`).
  Runs on every page (`main.js`, plus a small inline `<script>` on `checkout.html`, which
  doesn't load the full `main.js` bundle).
- `media/` currently includes an unused `I+phone+17+pro.obj`/`.gltf` model and
  `box_texture.png` (~19 MB combined) left over from an earlier experiment — nothing in the
  code references them. Safe to delete if you want to trim the repo.
