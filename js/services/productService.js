/**
 * productService.js
 * Every product read in the UI goes through this service, never through the
 * local data file directly. Today it resolves from the local catalog; when a
 * backend exists, only the bodies of these functions change (e.g. to
 * `fetch('/api/products')`) — callers and the returned shape stay identical.
 */

import { products } from '../data/products.js';
import { api, ApiError } from './apiClient.js';

const SIMULATED_LATENCY_MS = 0;

function delay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));
}

export function getProducts() {
  return delay([...products]);
}

export function getProductBySlug(slug) {
  const found = products.find((product) => product.slug === slug) || null;
  return delay(found);
}

export function getProductById(id) {
  const found = products.find((product) => product.id === id) || null;
  return delay(found);
}

/**
 * Resolves a local catalog product to its real backend record by slug (the
 * one identifier both catalogs are guaranteed to share — the local id
 * strings like "prod_guchhi_morel" are frontend-only). Used by checkout to
 * translate a local cart line into a real product id before talking to the
 * cart/checkout API. Returns null (rather than throwing) if the backend is
 * unreachable or the product doesn't exist there yet, so callers can decide
 * how to handle a partial sync.
 */
export async function resolveBackendProductBySlug(slug) {
  try {
    const result = await api.get(`/products/slug/${encodeURIComponent(slug)}`, { auth: false });
    return result?.product ?? null;
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}
