import { initRevealObserver } from './animations/reveal.js';
import { initShaderBackground } from './animations/shaderBackground.js';
import { initHeroAnimation } from './animations/hero/index.js';
import { initBackgroundMushroom } from './animations/backgroundMushroom.js';
import { initNavbar } from './components/navbar.js';
import { initAccordions } from './components/accordion.js';
import { initCart } from './cart/cartUI.js';
import { initAccount } from './account/accountUI.js';
import { sealAssets } from './assetReady.js';

function initPage() {
  initRevealObserver();
  initShaderBackground();
  initHeroAnimation();
  initBackgroundMushroom();
  initNavbar();
  initAccordions('.accordion');
  initCart();
  initAccount();

  // All modules have had their chance to call registerAsset().
  // Seal the registry so the asset-ready promise can resolve.
  sealAssets();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
