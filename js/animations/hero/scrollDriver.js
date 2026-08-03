/**
 * scrollDriver.js
 * Tracks how far the user has scrolled through the pinned `.hero-scroll`
 * section, expressed as a 0-1 progress value. Listens passively and lets the
 * render loop read the latest value each frame rather than recomputing
 * anything inside the scroll event itself.
 */

import { clamp } from './mathUtils.js';

export function createScrollDriver(heroElement) {
  let progress = 0;

  function recompute() {
    const scrollLength = Math.max(heroElement.offsetHeight - window.innerHeight, 1);
    progress = clamp((window.scrollY - heroElement.offsetTop) / scrollLength);
  }

  window.addEventListener('scroll', recompute, { passive: true });
  recompute();

  return {
    get value() {
      return progress;
    },
    recompute,
    dispose() {
      window.removeEventListener('scroll', recompute);
    }
  };
}
