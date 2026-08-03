/**
 * authService.js
 * Placeholder authentication service. No account system exists yet, so
 * every method resolves to a signed-out state. Replace the bodies with real
 * calls (e.g. POST /api/auth/login) when accounts ship; components that
 * call this service today (there are none yet) won't need to change shape.
 */

export async function getCurrentUser() {
  return null;
}

export async function login(email, password) {
  return { success: false, message: 'Accounts are not yet available.' };
}

export async function logout() {
  return { success: true };
}
