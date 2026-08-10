# Guchhi — Wild-Foraged Himalayan Food Products

**Guchhi** is a premium ecommerce platform for wild-harvested Himalayan produce — Guchhi Mushrooms, Red Rice, and Rajma — sourced directly from the forests and terraced fields of Himachal Pradesh (Kullu, Chamba, Bharmour, and Shimla hills).

> Proprietor: **Anshu Sood** · FSSAI Lic. No. **23326001002346**
> Contact: hello@guchhi.in · +91 98715 20888
> Address: D5/94, Sector 15, Rohini, Delhi – 110089, India

---

## Project Structure

```
guchhi/
├── index.html               # Homepage (hero, about, products, origins, trust, contact)
├── checkout.html            # Checkout page
├── styles.css               # Global design system (Mountain Elegance theme)
├── js/
│   ├── main.js              # App entry point
│   ├── loader.js            # Asset loading logic
│   ├── assetReady.js        # Asset readiness utility
│   ├── animations/          # Scroll-driven hero & section animations
│   ├── cart/                # Cart UI & state management
│   ├── checkout/            # Checkout flow logic
│   ├── components/          # Shared UI components (nav, footer, etc.)
│   ├── data/                # Static product & content data
│   ├── services/            # API service layer
│   │   ├── apiClient.js     # Base HTTP client with auth headers
│   │   ├── authService.js   # Login, signup, token refresh
│   │   ├── cartService.js   # Cart CRUD (guest + logged-in)
│   │   ├── checkoutService.js # Order creation & payment verification
│   │   └── productService.js  # Product listings & detail fetch
│   ├── utils/               # Helpers (storage.js, UUID, etc.)
│   └── vendor/              # Third-party scripts
├── products/
│   ├── morels.html          # Guchhi Mushroom detail page
│   ├── red-rice.html        # Himalayan Red Rice detail page
│   └── rajma.html           # Premium Rajma detail page
├── media/                   # Images, videos & other media assets
├── scripts/                 # Build or utility scripts
├── backend/                 # Node.js/Express/TypeScript/Prisma/PostgreSQL API
│   └── README.md            # Full backend setup guide
├── DESIGN.md                # Design system reference (Mountain Elegance)
├── product_data.txt         # Raw product copy & nutritional data
└── raw_website_info.txt     # Original website brief & section requirements
```

---

## The Website

### Design Theme — Mountain Elegance

The UI captures **"Mountain Elegance"**: the raw, untamed spirit of the Himalayas paired with the refinement of high-end gastronomy. The design targets a discerning global audience that values provenance, rarity, and artisanal craft.

| Token | Value |
|-------|-------|
| **Primary (Forest Deep)** | Near-black green `#061b0e` — headings & key brand moments |
| **Secondary (Earthy Ochre)** | `#7c5730` — accents, CTAs, interactive highlights |
| **Surface (Mist)** | Warm off-white `#faf9f6` — prevents visual fatigue, feels organic |
| **Headline font** | Playfair Display 700 — editorial, heritage feel |
| **Body font** | Work Sans 400 — high legibility for provenance stories |
| **Layout** | 12-col editorial grid (desktop) → fluid on mobile |
| **Depth** | Tonal layers & fine outlines — no traditional drop-shadows. Glassmorphism for nav/modals only (backdrop-blur 20px). |

### Site Sections

| # | Section | Description |
|---|---------|-------------|
| 1 | **Hero** | Animated box falls from top on page load, rotates and flips on scroll, opens to reveal a Guchhi mushroom that fades out as the section ends. Company name reveal + description appear as the mushroom falls. Nature/mountain background (Himachal Pradesh-inspired). |
| 2 | **Navigation** | Logo + brand name (left). Nav links to site sections. Product dropdown: Guchhi Mushroom / Himalayan Red Rice / Premium Rajma / View All. |
| 3 | **About** | Company story — Direct Sourcing, Authenticity, Premium Quality, Sustainable Practices. Why Guchhi. |
| 4 | **Products** | Three current product cards linking to individual detail pages. Product range may expand. |
| 5 | **Where It Comes From** | Three harvests, three valleys: Chamba & Bharmour (Rajma), Kullu Valley (Guchhi), Shimla Hills (Red Rice). |
| 6 | **Trust & Credibility** | Customer reviews + FSSAI Lic. No. 23326001002346 · Batch-coded & date-stamped · Hand-graded whole caps · Sun-dried, never kilned · Recyclable packaging. |
| 7 | **Contact** | Contact form + phone/email. |
| 8 | **Footer** | Nav links, product links, address, Proprietor: Anshu Sood · © 2026 Guchhi · Wild-Foraged Food Products. |

### Product Pages

Each product has a dedicated detail page with full provenance story, species information, nutritional data, cooking instructions, and a Provenance Map component.

| Product | File | Species | Pack | Price | Origin | Harvest |
|---------|------|---------|------|-------|--------|---------|
| **Guchhi Mushroom** | `products/morels.html` | *Morchella esculenta* | 50 g | ₹1,500 | Kullu, Chamba & Kashmir · 1,800–3,200 m | March–May (~6 weeks) |
| **Himalayan Red Rice** | `products/red-rice.html` | *Oryza sativa* (red pericarp) | 1 kg | — | Shimla Hills · 1,400–2,400 m | September–October |
| **Premium Rajma** | `products/rajma.html` | *Phaseolus vulgaris*, Bharmour | 500 g | — | Chamba district · 2,000–2,900 m | October–November |

### Harvest Origins

| Valley | Elevation | River Basin | Product |
|--------|-----------|-------------|---------|
| Kullu Valley | 1,800 – 3,200 m | Beas Basin | Guchhi Mushroom |
| Chamba & Bharmour | 2,000 – 2,900 m | Ravi Basin | Premium Rajma |
| Shimla Hills | 1,400 – 2,400 m | Mid-Himalaya | Himalayan Red Rice |

---

## Quick Start (Local Development)

### Frontend

The frontend is fully static — no build step required:

```bash
# Option A – npx serve
npx serve -l 5500 .

# Option B – Python
python3 -m http.server 5500
```

Open `http://localhost:5500`.
Product pages: `/products/morels.html` · `/products/red-rice.html` · `/products/rajma.html`.

### Backend

Follow [`backend/README.md`](./backend/README.md) for the complete setup. Quick summary:

```bash
cd backend
cp .env.example .env          # fill in DB, Redis, JWT, Cloudinary, Razorpay, SMTP
npm install
npx prisma generate

# Fastest path — everything in Docker
docker compose up -d --build  # API starts on http://localhost:4000

# OR: local dev with hot reload (DB & Redis in Docker, API on host)
docker compose -f docker-compose.dev.yml up -d
npx prisma migrate dev
npm run prisma:seed           # seeds admin user, categories, sample products, coupon
npm run dev                   # tsx watch, http://localhost:4000
```

| URL | Purpose |
|-----|---------|
| `http://localhost:4000/api` | API base |
| `http://localhost:4000/api-docs` | Swagger / OpenAPI 3 docs |
| `GET http://localhost:4000/api/health` | Health check (DB + Redis) |

**Seeded admin:** `admin@guchhi.com` / `Admin@12345` — change immediately in any non-local environment.

---

## Backend Tech Stack

| Concern | Choice |
|---------|--------|
| Runtime | Node.js 20 LTS + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL 16 (Prisma ORM) |
| Cache | Redis — checkout sessions, rate limiting |
| Auth | JWT access tokens + rotating opaque refresh tokens (httpOnly cookie) |
| Payments | Razorpay — Orders API + HMAC-SHA256 server-side signature verification |
| Image storage | Cloudinary |
| Email | Nodemailer (SMTP) |
| Validation | Zod |
| API docs | Swagger / OpenAPI 3 (`/api-docs`) |
| Security | Helmet · CORS · HPP · express-rate-limit |
| Logging | Winston (app) + Morgan (HTTP access) |
| Containerization | Docker + Docker Compose |
| CI | GitHub Actions |

---

## Connecting the Frontend to the API

The service files in `js/services/` are wired up to `apiClient.js`. To activate them:

1. **Set the API base URL** — point `apiClient.js` at `http://localhost:4000/api` (or production URL).

2. **Auth** — `authService.js` handles login/signup. On success, store the `accessToken` and send it as `Authorization: Bearer <accessToken>` on every subsequent request. `apiClient.js` does this automatically once the token is set.

3. **Guest cart** — `js/utils/storage.js` already generates and persists a UUID per browser session. Pass it as the `x-guest-id` header on all cart and checkout requests. The backend merges the guest cart automatically when the guest logs in or signs up.

4. **Token refresh** — Refresh tokens arrive as `httpOnly` cookies scoped to `/api/auth`. Call `POST /api/auth/refresh-token` when any request returns `401` to receive a fresh access token.

### API Modules

All routes prefixed with `/api`:

| Module | Base Path | Key Endpoints |
|--------|-----------|---------------|
| Auth | `/auth` | signup, login, logout, refresh-token, forgot/reset-password, verify-email, change-password, me |
| Products | `/products` | list (search / filter / sort / paginate), featured, related, slug lookup; admin CRUD + image upload |
| Cart | `/cart` | get, add/update/remove item, clear, apply/remove coupon (guest + user) |
| Checkout | `/checkout` | summary, `create-order` (Razorpay), `verify-payment`, `cod-order` |
| Orders | `/orders` | my orders, get one, cancel, invoice; admin status management |
| Reviews | `/reviews` | list per product, submit (verified-purchase aware); admin moderation |
| Wishlist | `/wishlist` | list, add, remove, move-to-cart |
| Addresses | `/addresses` | CRUD for a logged-in user's saved addresses |
| Categories | `/categories` | public list/get; admin CRUD |
| Admin | `/admin/*` | dashboard, sales analytics, top products, customers, coupons, inventory |

Full request/response contracts are in Swagger at `/api-docs` and in `src/validators/*.ts`.

### Payment Flow (Razorpay)

```
1. POST /api/checkout/create-order
   → Backend computes totals, creates Razorpay Order, stores snapshot in Redis (30 min TTL)
   → Returns { checkoutId, razorpayOrderId, amount, keyId }

2. Frontend opens Razorpay Checkout modal with razorpayOrderId

3. POST /api/checkout/verify-payment  { checkoutId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
   → Backend recomputes HMAC-SHA256 from (order_id|payment_id) — never trusts frontend
   → On match (inside one DB transaction): re-checks stock, creates Order + OrderItems,
     decrements stock, records Payment as PAID, clears cart, redeems coupon, fires emails
```

A COD path (`POST /api/checkout/cod-order`) is also available — skips Razorpay, creates a `CONFIRMED` order with `Payment.status = PENDING`.

---

## Design System Reference

See [`DESIGN.md`](./DESIGN.md) for the complete design token specification: all color hex values, typography scales (display-lg through label-caps), spacing units, border-radius values, elevation rules, shape language, and individual component guidelines (buttons, cards, chips, inputs, the bespoke Provenance Map).

---

## License

Proprietary — internal project for Guchhi.
© 2026 Guchhi · Wild-Foraged Food Products. All rights reserved.
