/**
 * cartUI.js
 * Presentation only. Every mutation is delegated to cartService — this file
 * never reads or writes localStorage directly, and never computes prices.
 */

import {
  getDetailedCart,
  getSubtotal,
  getEstimatedShipping,
  getItemCount,
  updateQuantity,
  removeItem,
  FREE_SHIPPING_THRESHOLD
} from '../services/cartService.js';
import { applyCoupon, removeCoupon, getAppliedCouponCode } from '../services/checkoutService.js';
import { formatCurrency } from '../utils/format.js';

const FALLBACK_IMAGE = new URL('../../media/logo.jpg', import.meta.url).href;

let els = {};

function cacheElements() {
  els = {
    toggleButtons: document.querySelectorAll('[data-cart-open]'),
    closeButtons: document.querySelectorAll('[data-cart-close]'),
    overlay: document.getElementById('cart-overlay'),
    sidebar: document.getElementById('cart-sidebar'),
    badge: document.getElementById('cart-badge'),
    itemsContainer: document.getElementById('cart-items-container'),
    emptyState: document.getElementById('cart-empty-state'),
    subtotalEl: document.getElementById('cart-subtotal'),
    shippingEl: document.getElementById('cart-shipping'),
    discountRow: document.getElementById('cart-discount-row'),
    discountEl: document.getElementById('cart-discount'),
    couponInput: document.getElementById('cart-coupon-input'),
    couponApply: document.getElementById('cart-coupon-apply'),
    couponMessage: document.getElementById('cart-coupon-message'),
    checkoutBtn: document.getElementById('cart-checkout-btn')
  };
}

function renderLine(line) {
  const { product, quantity, lineTotal } = line;
  const imageSrc = product.thumbnail || product.images?.[0] || FALLBACK_IMAGE;
  const wrapper = document.createElement('div');
  wrapper.className = 'cart-line';
  wrapper.setAttribute('data-product-id', product.id);
  wrapper.innerHTML = `
    <div class="cart-line-thumb">
      <img src="${imageSrc}" alt="${product.name}" loading="lazy" onerror="this.onerror=null; this.src='${FALLBACK_IMAGE}';" />
    </div>
    <div class="cart-line-info">
      <p class="cart-line-name">${product.name}</p>
      <p class="cart-line-weight">${product.weight}</p>
      <div class="cart-line-qty" role="group" aria-label="Quantity for ${product.name}">
        <button type="button" class="cart-qty-btn" data-action="decrement" aria-label="Decrease quantity">−</button>
        <span aria-live="polite">${quantity}</span>
        <button type="button" class="cart-qty-btn" data-action="increment" aria-label="Increase quantity">+</button>
      </div>
    </div>
    <div class="cart-line-end">
      <p class="cart-line-price">${formatCurrency(lineTotal, product.currency)}</p>
      <button type="button" class="cart-remove-btn" data-action="remove" aria-label="Remove ${product.name} from cart">Remove</button>
    </div>
  `;
  return wrapper;
}

async function render() {
  if (!els.itemsContainer) return;

  const [lines, subtotal, shipping] = await Promise.all([
    getDetailedCart(),
    getSubtotal(),
    getEstimatedShipping()
  ]);

  els.itemsContainer.innerHTML = '';

  if (lines.length === 0) {
    if (els.emptyState) els.emptyState.classList.remove('hidden');
    if (els.checkoutBtn) els.checkoutBtn.setAttribute('disabled', 'true');
  } else {
    if (els.emptyState) els.emptyState.classList.add('hidden');
    if (els.checkoutBtn) els.checkoutBtn.removeAttribute('disabled');
    lines.forEach((line) => els.itemsContainer.appendChild(renderLine(line)));
  }

  if (els.subtotalEl) els.subtotalEl.textContent = formatCurrency(subtotal);
  if (els.shippingEl) {
    els.shippingEl.textContent =
      subtotal === 0 ? '—' : shipping === 0 ? 'Free' : formatCurrency(shipping);
  }

  await renderCoupon(lines.length);

  const count = getItemCount();
  if (els.badge) {
    if (count > 0) {
      els.badge.textContent = String(count);
      els.badge.classList.remove('hidden');
    } else {
      els.badge.classList.add('hidden');
    }
  }
}

/**
 * Re-validates the applied coupon (if any) against the current cart and
 * shows/hides the discount row. Called on every render so quantity changes
 * that push the cart below a coupon's minimum order value are reflected
 * immediately, not just at checkout.
 */
async function renderCoupon(itemCount) {
  const code = getAppliedCouponCode();
  if (!code || itemCount === 0) {
    if (els.discountRow) els.discountRow.style.display = 'none';
    if (els.couponInput) els.couponInput.value = '';
    return;
  }

  if (els.couponInput) els.couponInput.value = code;

  const { getSummary } = await import('../services/checkoutService.js');
  try {
    const summary = await getSummary({ couponCode: code });
    if (summary.discount > 0 && els.discountRow && els.discountEl) {
      els.discountRow.style.display = '';
      els.discountEl.textContent = `−${formatCurrency(summary.discount)}`;
      if (els.couponMessage) {
        els.couponMessage.innerHTML = `"${code}" applied. <button type="button" id="cart-coupon-remove" class="underline">Remove</button>`;
      }
    } else if (els.discountRow) {
      // Coupon no longer qualifies (e.g. cart dropped below its minimum,
      // or it expired) — hide the row but leave the code in the input so
      // the person can see what stopped applying.
      els.discountRow.style.display = 'none';
      if (els.couponMessage) els.couponMessage.textContent = `"${code}" no longer applies to this cart.`;
    }
  } catch {
    if (els.discountRow) els.discountRow.style.display = 'none';
  }
}

function openCart() {
  if (!els.sidebar) return;
  els.sidebar.classList.add('cart-sidebar--open');
  els.overlay?.classList.add('cart-overlay--visible');
  els.sidebar.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  if (!els.sidebar) return;
  els.sidebar.classList.remove('cart-sidebar--open');
  els.overlay?.classList.remove('cart-overlay--visible');
  els.sidebar.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function bindEvents() {
  els.toggleButtons.forEach((btn) => btn.addEventListener('click', openCart));
  els.closeButtons.forEach((btn) => btn.addEventListener('click', closeCart));
  els.overlay?.addEventListener('click', closeCart);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCart();
  });

  els.itemsContainer?.addEventListener('click', async (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const lineEl = event.target.closest('.cart-line');
    const productId = lineEl?.getAttribute('data-product-id');
    if (!productId) return;

    const qtyLabel = lineEl.querySelector('.cart-line-qty span');
    const currentQty = parseInt(qtyLabel?.textContent || '1', 10);

    if (actionEl.dataset.action === 'increment') {
      await updateQuantity(productId, currentQty + 1);
    } else if (actionEl.dataset.action === 'decrement') {
      await updateQuantity(productId, currentQty - 1);
    } else if (actionEl.dataset.action === 'remove') {
      await removeItem(productId);
    }
  });

  els.couponApply?.addEventListener('click', async () => {
    const code = els.couponInput?.value?.trim();
    if (!code) return;

    const originalLabel = els.couponApply.textContent;
    els.couponApply.textContent = '...';
    els.couponApply.disabled = true;
    if (els.couponMessage) {
      els.couponMessage.textContent = '';
      els.couponMessage.style.color = '';
    }

    const result = await applyCoupon(code);

    els.couponApply.textContent = originalLabel;
    els.couponApply.disabled = false;

    if (els.couponMessage) {
      els.couponMessage.style.color = result.success ? '#3f6b3f' : '#a3402c';
      els.couponMessage.textContent = result.message;
    }
    if (result.success) render();
  });

  els.couponMessage?.addEventListener('click', async (event) => {
    if (event.target.id !== 'cart-coupon-remove') return;
    await removeCoupon();
    render();
  });

  els.checkoutBtn?.addEventListener('click', () => {
    const isInSubdirectory = window.location.pathname.includes('/products/');
    window.location.href = isInSubdirectory ? '../checkout.html' : 'checkout.html';
  });

  window.addEventListener('cart:updated', render);
}

/**
 * Quick-add handler for product cards and product pages. Buttons that want
 * to add to cart should carry data-add-to-cart="<productId>" and, optionally,
 * data-quantity-input="<inputId>" to read a custom quantity.
 */
function bindAddToCartButtons() {
  document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
    btn.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const productId = btn.getAttribute('data-add-to-cart');
      const qtyInputId = btn.getAttribute('data-quantity-input');
      const qtyInput = qtyInputId ? document.getElementById(qtyInputId) : null;
      const quantity = qtyInput ? Math.max(1, parseInt(qtyInput.value, 10) || 1) : 1;

      try {
        const { addItem } = await import('../services/cartService.js');
        await addItem(productId, quantity);
      } catch (err) {
        console.warn('[cart] addItem failed:', err);
      }

      const originalText = btn.textContent;
      btn.textContent = 'Added';
      btn.classList.add('add-to-cart--confirmed');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('add-to-cart--confirmed');
      }, 1400);

      openCart();
    });
  });
}

export function initCart() {
  cacheElements();
  bindEvents();
  bindAddToCartButtons();
  render();
}
