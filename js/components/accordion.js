/**
 * accordion.js
 * A slow, understated accordion used for FAQ and the brand-story list.
 * Height is animated via max-height transitions defined in styles.css so
 * the motion stays gentle and consistent with the rest of the site.
 */

export function initAccordions(rootSelector) {
  document.querySelectorAll(rootSelector).forEach((accordion) => {
    const items = accordion.querySelectorAll('.accordion-item');

    items.forEach((item) => {
      const trigger = item.querySelector('.accordion-trigger');
      const panel = item.querySelector('.accordion-panel');
      if (!trigger || !panel) return;

      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('accordion-item--open');

        items.forEach((otherItem) => {
          otherItem.classList.remove('accordion-item--open');
          const otherTrigger = otherItem.querySelector('.accordion-trigger');
          const otherPanel = otherItem.querySelector('.accordion-panel');
          otherTrigger?.setAttribute('aria-expanded', 'false');
          if (otherPanel) otherPanel.style.maxHeight = null;
        });

        if (!isOpen) {
          item.classList.add('accordion-item--open');
          trigger.setAttribute('aria-expanded', 'true');
          panel.style.maxHeight = `${panel.scrollHeight}px`;
        }
      });
    });
  });
}
