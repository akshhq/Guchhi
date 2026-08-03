import { NextFunction, Request, Response } from 'express';

/**
 * Cart routes must work for both logged-in users and anonymous shoppers.
 * The frontend generates a stable per-browser guest id (e.g. a UUID persisted
 * in localStorage, matching this project's existing storage.js pattern) and
 * sends it as the `x-guest-id` header. This middleware resolves a single
 * `actor` shape ({ userId } or { guestId }) that every cart service method uses.
 */
export function resolveCartActor(req: Request, res: Response, next: NextFunction) {
  const guestId = req.header('x-guest-id');
  req.cartActor = req.user ? { userId: req.user.id } : guestId ? { guestId } : undefined;
  next();
}

declare global {
  namespace Express {
    interface Request {
      cartActor?: { userId?: string; guestId?: string };
    }
  }
}
