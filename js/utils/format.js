/**
 * format.js
 * Small, dependency-free formatting helpers shared across the site.
 */

export function formatCurrency(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (err) {
    return `₹${amount}`;
  }
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
