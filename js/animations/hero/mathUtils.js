/**
 * mathUtils.js
 * Tiny, dependency-free helpers shared across the hero animation modules.
 */

export function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

/** Maps `value` from the [start, end] range onto [0, 1], clamped. */
export function rangeProgress(value, start, end) {
  return clamp((value - start) / (end - start));
}

/** Smoothstep-style ease for organic, non-linear motion. */
export function ease(value) {
  return value * value * (3 - 2 * value);
}

/** Deterministic pseudo-random in [0, 1), seeded by an integer — used for
 * per-mushroom natural imperfections without relying on Math.random(). */
export function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
