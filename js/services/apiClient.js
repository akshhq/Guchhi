/**
 * apiClient.js
 * The single place that knows how to talk to the backend. Every service
 * (cart, checkout, auth, products) goes through this rather than calling
 * fetch() directly, so base URL, guest identity, and auth all stay
 * consistent — and so there is exactly one file to change if any of that
 * ever needs to change.
 */

import { getItem, setItem } from '../utils/storage.js';

const GUEST_ID_KEY = 'guchhi:guest-id';
const ACCESS_TOKEN_KEY = 'guchhi:access-token';

/**
 * The backend isn't deployed alongside this static site by default, so this
 * defaults to a local dev API. Override by setting `window.GUCHHI_API_BASE_URL`
 * before this module loads (e.g. in a small inline script tag) once a real
 * backend URL exists — nothing else in the app needs to change.
 */
export const API_BASE_URL =
  (typeof window !== 'undefined' && window.GUCHHI_API_BASE_URL) || 'http://localhost:4000/api/v1';

/**
 * A stable per-browser identity for guest carts/checkout, sent as the
 * `x-guest-id` header the backend's cart middleware expects. Generated once
 * and persisted — never regenerated, or a returning guest would silently
 * lose their cart.
 */
export function getGuestId() {
  let guestId = getItem(GUEST_ID_KEY, null);
  if (!guestId) {
    guestId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

export function getAccessToken() {
  return getItem(ACCESS_TOKEN_KEY, null);
}

export function setAccessToken(token) {
  setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  setItem(ACCESS_TOKEN_KEY, null);
}

/** Thrown for any non-2xx response, with the backend's own message when available. */
export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

/**
 * Access tokens expire quickly (15 min — see backend JWT_ACCESS_EXPIRES_IN).
 * The backend issues a long-lived refresh token as an httpOnly cookie
 * (see auth.controller.ts setRefreshCookie), scoped to /api/auth, so it's
 * sent automatically by fetch's `credentials: 'include'` — this function
 * never touches it directly.
 *
 * Concurrency note: if several requests 401 around the same moment (e.g.
 * a page loads and fires 3 authenticated calls right as the token expires),
 * they must not each trigger their own refresh — that would race the
 * refresh token's single-use rotation on the backend and log the second
 * caller out. `refreshPromise` makes every concurrent 401 await the same
 * in-flight refresh call instead.
 */
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json().catch(() => null);
        const token = body?.data?.accessToken ?? null;
        if (token) setAccessToken(token);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * @param {string} path e.g. '/cart/items'
 * @param {RequestInit & { auth?: boolean }} options
 */
export async function apiFetch(path, options = {}) {
  const { auth = true, headers, _isRetry, ...rest } = options;

  const requestHeaders = {
    'Content-Type': 'application/json',
    'x-guest-id': getGuestId(),
    ...headers,
  };

  if (auth) {
    const token = getAccessToken();
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include', // send the refresh-token cookie when present
      headers: requestHeaders,
      ...rest,
    });
  } catch (networkErr) {
    // The backend isn't reachable at all (not deployed, offline, CORS
    // misconfigured, etc.) — surface a message the UI can show directly
    // rather than a raw "Failed to fetch".
    throw new ApiError('Could not reach the server. Please check your connection and try again.', 0);
  }

  // A 401 on an authenticated request most likely means the access token
  // expired mid-session — try exactly once to refresh it and replay the
  // request before giving up and treating this as a real auth failure.
  // Requests made with `auth: false` (login/signup/etc.) are never retried
  // this way, since a 401 there means the credentials were actually wrong.
  if (response.status === 401 && auth && getAccessToken() && !_isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch(path, { ...options, _isRetry: true });
    }
    // Refresh failed too (refresh token expired/revoked) — the session is
    // genuinely over. Clear the stale access token so the UI stops
    // pretending the person is signed in.
    clearAccessToken();
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // No JSON body (e.g. a 204, or an upstream proxy error page) — fine, body stays null.
  }

  if (!response.ok) {
    const message = body?.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, body?.errors || []);
  }

  return body?.data ?? body;
}

export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, data, options) => apiFetch(path, { ...options, method: 'POST', body: JSON.stringify(data ?? {}) }),
  patch: (path, data, options) => apiFetch(path, { ...options, method: 'PATCH', body: JSON.stringify(data ?? {}) }),
  delete: (path, options) => apiFetch(path, { ...options, method: 'DELETE' }),
};
