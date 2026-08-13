/**
 * authService.js
 * Talks to the real backend auth API (backend/src/routes/auth.routes.ts).
 * The access token is kept in localStorage (via apiClient's
 * getAccessToken/setAccessToken/clearAccessToken) and sent as
 * `Authorization: Bearer <token>` on every authenticated request.
 * The refresh token is an httpOnly cookie the backend sets itself — this
 * file never reads or stores it directly.
 *
 * Every mutation that changes sign-in state (login, signup, logout) dispatches
 * an `auth:changed` event on window, mirroring the `cart:updated` pattern in
 * cartService.js, so any UI (header, account menu) can stay in sync without
 * being coupled to this module's internals.
 */

import { api, ApiError, getAccessToken, setAccessToken, clearAccessToken } from './apiClient.js';

function broadcastAuthChanged(user) {
  window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
}

/**
 * Returns the signed-in user, or null if signed out / the session is invalid.
 * Safe to call on every page load — never throws.
 */
export async function getCurrentUser() {
  if (!getAccessToken()) return null;
  try {
    const result = await api.get('/auth/me');
    return result?.user ?? null;
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      // Access token expired/invalid and refresh didn't help — clear it so
      // callers don't keep treating this browser as signed in.
      clearAccessToken();
      return null;
    }
    // Network error etc. — don't wipe the token over a transient failure;
    // just report signed-out for this call.
    return null;
  }
}

export async function signup({ firstName, lastName, email, phone, password }) {
  try {
    const result = await api.post(
      '/auth/signup',
      { firstName, lastName, email, phone, password },
      { auth: false }
    );
    setAccessToken(result.accessToken);
    broadcastAuthChanged(result.user);
    return { success: true, user: result.user };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not create account. Please try again.';
    return { success: false, message, errors: err instanceof ApiError ? err.errors : [] };
  }
}

export async function login(email, password) {
  try {
    const result = await api.post('/auth/login', { email, password }, { auth: false });
    setAccessToken(result.accessToken);
    broadcastAuthChanged(result.user);
    return { success: true, user: result.user };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not log in. Please try again.';
    return { success: false, message };
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Even if the server call fails (e.g. already-expired session), still
    // clear local state below so the UI reflects signed-out immediately.
  }
  clearAccessToken();
  broadcastAuthChanged(null);
  return { success: true };
}

export async function forgotPassword(email) {
  try {
    // Backend intentionally returns the same message whether or not the
    // account exists, so there's nothing to branch on here besides network
    // failure — surface that as a generic failure state.
    await api.post('/auth/forgot-password', { email }, { auth: false });
    return { success: true, message: 'If an account exists with this email, a reset link has been sent.' };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
    return { success: false, message };
  }
}

export async function resetPassword(token, password) {
  try {
    await api.post('/auth/reset-password', { token, password }, { auth: false });
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not reset password. The link may have expired.';
    return { success: false, message };
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not change password.';
    return { success: false, message };
  }
}

export function isLoggedIn() {
  return Boolean(getAccessToken());
}
