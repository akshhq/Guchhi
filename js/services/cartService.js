/**
 * cartService.js
 * The single source of truth for cart state. No UI component mutates the
 * cart directly — everything goes through addItem / removeItem / updateQuantity
 * / clearCart. State is persisted to localStorage under CART_KEY, and every
 * mutation dispatches a `cart:updated` event on window so any UI (sidebar,
 * badge, page-specific widgets) can stay in sync without being coupled to
 * this module's internals.
 *
 * Cart entries follow an API-compatible shape:
 *   { id, quantity, selectedVariant }
 * `id` refers to a product id from productService — the cart never stores
 * duplicated product data, so it can be sent straight to a backend as-is.
 *
 * When a real backend exists, swap the body of each exported function for
 * the equivalent authenticated fetch call (e.g. POST /api/cart/items) and
 * every caller in the app keeps working unchanged.
 */

import { getItem, setItem } from '../utils/storage.js';
import { getProductById } from './productService.js';

const CART_KEY = 'guchhi:cart';
const SHIPPING_FLAT_RATE = 99;
const FREE_SHIPPING_THRESHOLD = 1500;

function readCart() {
  return getItem(CART_KEY, []);
}

function writeCart(cartItems) {
  setItem(CART_KEY, cartItems);
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items: cartItems } }));
  return cartItems;
}

export function getCart() {
  return readCart();
}

export async function addItem(productId, quantity = 1, selectedVariant = null) {
  const cartItems = readCart();
  const existing = cartItems.find(
    (item) => item.id === productId && item.selectedVariant === selectedVariant
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    cartItems.push({ id: productId, quantity, selectedVariant });
  }

  return writeCart(cartItems);
}

export function removeItem(productId, selectedVariant = null) {
  const cartItems = readCart().filter(
    (item) => !(item.id === productId && item.selectedVariant === selectedVariant)
  );
  return writeCart(cartItems);
}

export function updateQuantity(productId, quantity, selectedVariant = null) {
  let cartItems = readCart();

  if (quantity <= 0) {
    cartItems = cartItems.filter(
      (item) => !(item.id === productId && item.selectedVariant === selectedVariant)
    );
  } else {
    const existing = cartItems.find(
      (item) => item.id === productId && item.selectedVariant === selectedVariant
    );
    if (existing) existing.quantity = quantity;
  }

  return writeCart(cartItems);
}

export function clearCart() {
  return writeCart([]);
}

export function getItemCount() {
  return readCart().reduce((total, item) => total + item.quantity, 0);
}

/**
 * Resolves cart line items against live product data (price, name, image),
 * so the UI never has to reach into productService itself.
 */
export async function getDetailedCart() {
  const cartItems = readCart();
  const detailed = await Promise.all(
    cartItems.map(async (item) => {
      const product = await getProductById(item.id);
      if (!product) return null;
      return {
        ...item,
        product,
        lineTotal: product.price * item.quantity
      };
    })
  );
  return detailed.filter(Boolean);
}

export async function getSubtotal() {
  const detailed = await getDetailedCart();
  return detailed.reduce((total, line) => total + line.lineTotal, 0);
}

export async function getEstimatedShipping() {
  const subtotal = await getSubtotal();
  if (subtotal === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
}

/**
 * Coupon validation placeholder. Structured so a real implementation can
 * call POST /api/cart/coupon and return { valid, discount, message }.
 */
export async function applyCoupon(code) {
  return { valid: false, discount: 0, message: 'Coupon codes are coming soon.' , code };
}

export { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE };
