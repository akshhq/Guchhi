/**
 * checkoutService.js
 * Talks to the real checkout API. The local cart (cartService.js) is the
 * source of truth for "what's in the cart" throughout the rest of the site;
 * this module's job is to mirror those lines into the backend's own cart
 * for the actor (guest or logged-in user) right before checkout starts,
 * then drive the actual checkout endpoints from there.
 *
 * Bridging note: the local catalog and the backend catalog are independent
 * data sources that agree on `slug` (e.g. "morels") but not on `id` — local
 * ids like "prod_guchhi_morel" are frontend-only. syncServerCart() resolves
 * each local line to its real backend product before adding it server-side.
 */

import { api } from './apiClient.js';
import { getCart as getLocalCart, getDetailedCart } from './cartService.js';
import { resolveBackendProductBySlug } from './productService.js';
import { getItem as getLocalStorageItem, setItem as setLocalStorageItem } from '../utils/storage.js';
import { formatCurrency } from '../utils/format.js';

/**
 * Mirrors the local cart into the backend's server-side cart.
 * @returns {{ ok: boolean, unavailable: Array<{ name: string }> }}
 *   `unavailable` lists local cart lines that couldn't be resolved against
 *   the backend catalog (e.g. product removed, backend unreachable) so the
 *   checkout UI can warn the person before they get to payment.
 */
export async function syncServerCart() {
  const localLines = getLocalCart();
  const detailed = await getDetailedCart();
  const unavailable = [];

  // Reset the server cart first so it exactly mirrors the local one, rather
  // than merging with whatever was left over from a previous session.
  try {
    await api.delete('/cart');
  } catch {
    return { ok: false, unavailable: [] };
  }

  for (const line of detailed) {
    const backendProduct = await resolveBackendProductBySlug(line.product.slug);
    if (!backendProduct) {
      unavailable.push({ name: line.product.name });
      continue;
    }
    try {
      await api.post('/cart/items', { productId: backendProduct.id, quantity: line.quantity });
    } catch (err) {
      unavailable.push({ name: line.product.name, reason: err.message });
    }
  }

  return { ok: localLines.length === 0 || unavailable.length < detailed.length, unavailable };
}

/** Server-computed totals (subtotal/discount/tax/shipping/total) for the current step's address + coupon. */
export async function getSummary({ shippingAddress, couponCode } = {}) {
  return api.post('/checkout/summary', { shippingAddress, couponCode });
}

const APPLIED_COUPON_KEY = 'guchhi:applied-coupon';

/** The coupon code applied from the cart sidebar, if any — used to pre-fill the checkout page's coupon field. */
export function getAppliedCouponCode() {
  return getLocalStorageItem(APPLIED_COUPON_KEY, null);
}

export function clearAppliedCoupon() {
  setLocalStorageItem(APPLIED_COUPON_KEY, null);
}

/**
 * Applies a coupon code to the cart. Coupon rules (validity window,
 * per-user usage limit, minimum order value, expiry) all live server-side
 * in backend/src/services/coupon.service.ts — this just surfaces whatever
 * the server decides.
 *
 * Since the server only knows about the server-side cart (see the module
 * doc above), this syncs the local cart across first so the coupon is
 * validated against what the shopper actually has in their cart.
 *
 * @returns {{ success: boolean, message: string, discount?: number, total?: number }}
 */
export async function applyCoupon(code) {
  if (!code || !code.trim()) {
    return { success: false, message: 'Enter a coupon code.' };
  }

  const sync = await syncServerCart();
  if (!sync.ok) {
    return { success: false, message: 'Could not reach the server to apply this coupon. Please try again.' };
  }

  try {
    const result = await api.post('/cart/coupon', { code: code.trim() });
    setLocalStorageItem(APPLIED_COUPON_KEY, code.trim());
    window.dispatchEvent(new CustomEvent('cart:updated', {}));
    return {
      success: true,
      message: `Coupon applied — you saved ${formatCurrency(result.cart.discount)}.`,
      discount: result.cart.discount,
      total: result.cart.total,
    };
  } catch (err) {
    return { success: false, message: err.message || 'Could not apply that coupon.' };
  }
}

export async function removeCoupon() {
  clearAppliedCoupon();
  try {
    await api.delete('/cart/coupon');
  } catch {
    // If the server cart doesn't have a coupon applied (e.g. it was never
    // synced), there's nothing to remove server-side — that's fine, the
    // local applied-coupon flag above is already cleared either way.
  }
  window.dispatchEvent(new CustomEvent('cart:updated', {}));
}

/** Step 1 of the Razorpay flow: creates a Razorpay order + a server-side checkout snapshot. */
export async function createRazorpayOrder(input) {
  return api.post('/checkout/create-order', input);
}

/** Step 2: verifies the Razorpay signature and places the order. Never trust a client-side "payment succeeded" without this. */
export async function verifyPayment({ checkoutId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  return api.post('/checkout/verify-payment', {
    checkoutId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
}

/** Cash-on-delivery path: places the order immediately, no payment gateway involved. */
export async function createCodOrder(input) {
  return api.post('/checkout/cod-order', input);
}
