# Guchhi — Full Stack

This package contains both halves of the Guchhi ecommerce project:

```
guchhi-fullstack/
  frontend/   # Existing plain HTML/CSS/vanilla JS site (unchanged in architecture)
  backend/    # Node.js/Express/TypeScript/Prisma/PostgreSQL API (see backend/README.md)
```

## Quick start

1. **Backend** — follow `backend/README.md` in full (env setup, Docker Compose, migrations,
   seed data). It boots the API at `http://localhost:4000` with docs at `/api-docs`.

2. **Frontend** — it's fully static, so any static server works, e.g.:
   ```bash
   cd frontend
   npx serve -l 5500 .
   # or: python3 -m http.server 5500
   ```
   Open `http://localhost:5500`.

3. **Wire them together** — the frontend's `js/services/*.js` files (`cartService`,
   `productService`, `checkoutService`, `authService`, `wishlistService`) are placeholders
   awaiting a real API base URL. Point them at `http://localhost:4000/api` and:
   - Send `Authorization: Bearer <accessToken>` once a user logs in.
   - Generate a UUID per browser (already how `js/utils/storage.js` persists local data) and
     send it as an `x-guest-id` header for guest cart/checkout — it merges automatically once
     the guest logs in or signs up.

   `backend/.env.example` → `ALLOWED_ORIGINS` / `CLIENT_URL` should match wherever you serve
   the frontend from (`http://localhost:5500` by default).

No HTML/CSS/frontend JS was written by the backend work — the two halves are fully
independent and only communicate over REST, exactly as specified.
