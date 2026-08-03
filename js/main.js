import { initRevealObserver } from './animations/reveal.js';
import { initShaderBackground } from './animations/shaderBackground.js';
import { initHeroAnimation } from './animations/hero/index.js';
import { initNavbar } from './components/navbar.js';
import { initAccordions } from './components/accordion.js';
import { initCart } from './cart/cartUI.js';

function initPage() {
  initRevealObserver();
  initShaderBackground();
  initHeroAnimation();
  initNavbar();
  initAccordions('.accordion');
  initCart();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
