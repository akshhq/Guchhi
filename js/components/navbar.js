/**
 * navbar.js
 * Handles the transparent-to-solid scroll transition, the active-section
 * underline, and the mobile menu open/close animation. Purely presentational.
 */

export function initNavbar() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const SCROLL_THRESHOLD = 24;

  function syncScrollState() {
    if (window.scrollY > SCROLL_THRESHOLD) {
      nav.classList.add('nav-solid');
    } else {
      nav.classList.remove('nav-solid');
    }
  }
  syncScrollState();
  window.addEventListener('scroll', syncScrollState, { passive: true });

  // Active section indicator — only meaningful on pages with in-page sections.
  const sectionLinks = document.querySelectorAll('[data-nav-link]');
  const sections = Array.from(sectionLinks)
    .map((link) => {
      const targetId = link.getAttribute('data-nav-link');
      return { link, section: document.getElementById(targetId) };
    })
    .filter((entry) => entry.section);

  if (sections.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const match = sections.find((s) => s.section === entry.target);
          if (!match) return;
          if (entry.isIntersecting) {
            sectionLinks.forEach((l) => l.classList.remove('nav-link--active'));
            match.link.classList.add('nav-link--active');
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    sections.forEach(({ section }) => observer.observe(section));
  }

  // Mobile menu
  const menuToggle = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIcon = menuToggle?.querySelector('.material-symbols-outlined');

  if (menuToggle && mobileMenu) {
    const closeMenu = () => {
      mobileMenu.classList.remove('mobile-menu--open');
      menuToggle.setAttribute('aria-expanded', 'false');
      if (menuIcon) menuIcon.textContent = 'menu';
      document.body.style.overflow = '';
    };

    const openMenu = () => {
      mobileMenu.classList.add('mobile-menu--open');
      menuToggle.setAttribute('aria-expanded', 'true');
      if (menuIcon) menuIcon.textContent = 'close';
      document.body.style.overflow = 'hidden';
    };

    menuToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.contains('mobile-menu--open');
      isOpen ? closeMenu() : openMenu();
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  // Mobile "Products" dropdown inside the mobile menu
  const productsToggle = document.getElementById('mobile-products-toggle');
  const productsPanel = document.getElementById('mobile-products-panel');

  if (productsToggle && productsPanel) {
    productsToggle.addEventListener('click', () => {
      const isOpen = productsToggle.getAttribute('aria-expanded') === 'true';
      productsToggle.setAttribute('aria-expanded', String(!isOpen));
      productsToggle.closest('.mobile-menu-group')?.classList.toggle('mobile-menu-group--open', !isOpen);
      productsPanel.style.maxHeight = isOpen ? null : `${productsPanel.scrollHeight}px`;
    });
  }
}
