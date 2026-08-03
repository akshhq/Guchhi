/**
 * reveal.js
 * Fades and lifts elements marked .reveal-element into place as they enter
 * the viewport. Unchanged in behavior from the original implementation.
 */

export function initRevealObserver() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observerInstance.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal-element').forEach((el) => {
    observer.observe(el);
  });
}
