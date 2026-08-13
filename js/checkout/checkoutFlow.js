/**
 * checkoutFlow.js
 * Drives the multi-step checkout page: Cart → Shipping → Address → Review →
 * Payment. State lives in one place (`state` below) and every step reads
 * from / writes to it — no step reaches into another step's DOM.
 */

import { getDetailedCart, clearCart, FREE_SHIPPING_THRESHOLD } from '../services/cartService.js';
import { syncServerCart, getSummary, createRazorpayOrder, verifyPayment, createCodOrder, getAppliedCouponCode, clearAppliedCoupon } from '../services/checkoutService.js';
import { getAccessToken } from '../services/apiClient.js';
import { formatCurrency } from '../utils/format.js';

const STEP_ORDER = ['cart', 'shipping', 'address', 'review', 'payment'];

const state = {
  step: 'cart',
  lines: [],
  address: null,
  couponCode: '',
  summary: null, // server-computed totals, populated once the review step loads
};

let els = {};

function cacheElements() {
  els = {
    stepper: document.getElementById('checkout-stepper'),
    emptyState: document.getElementById('checkout-empty-state'),
    cartLines: document.getElementById('checkout-cart-lines'),
    syncWarning: document.getElementById('checkout-sync-warning'),
    shippingCost: document.getElementById('checkout-shipping-cost'),
    freeShippingThreshold: document.getElementById('checkout-free-shipping-threshold'),
    notes: document.getElementById('checkout-notes'),
    addressForm: document.getElementById('checkout-address-form'),
    guestFields: document.getElementById('checkout-guest-fields'),
    addressError: document.getElementById('checkout-address-error'),
    reviewAddress: document.getElementById('checkout-review-address'),
    couponInput: document.getElementById('checkout-coupon-input'),
    couponApply: document.getElementById('checkout-coupon-apply'),
    couponMessage: document.getElementById('checkout-coupon-message'),
    reviewTotals: document.getElementById('checkout-review-totals'),
    paymentError: document.getElementById('checkout-payment-error'),
    placeOrderBtn: document.getElementById('checkout-place-order'),
    successNumber: document.getElementById('checkout-success-number'),
    summaryLines: document.getElementById('checkout-summary-lines'),
    summarySubtotal: document.getElementById('checkout-summary-subtotal'),
    summaryDiscount: document.getElementById('checkout-summary-discount'),
    summaryShipping: document.getElementById('checkout-summary-shipping'),
    summaryTax: document.getElementById('checkout-summary-tax'),
    summaryTotal: document.getElementById('checkout-summary-total'),
  };
}

// ---------- Rendering ----------

function renderStepper() {
  const currentIndex = STEP_ORDER.indexOf(state.step);
  els.stepper?.querySelectorAll('.checkout-step').forEach((li) => {
    const stepIndex = STEP_ORDER.indexOf(li.dataset.step);
    li.classList.toggle('checkout-step--active', stepIndex === currentIndex);
    li.classList.toggle('checkout-step--done', stepIndex < currentIndex);
  });
}

function showPanel(step) {
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.panel !== step);
  });
}

function renderCartLines(container, lines) {
  container.innerHTML = '';
  lines.forEach((line) => {
    const row = document.createElement('div');
    row.className = 'checkout-cart-line';
    row.innerHTML = `
      <img src="${line.product.thumbnail}" alt="${line.product.name}" loading="lazy" />
      <div class="checkout-cart-line-info">
        <p class="font-body-md text-primary">${line.product.name}</p>
        <p class="text-xs text-on-surface-variant">${line.product.weight} · Qty ${line.quantity}</p>
      </div>
      <p class="font-label-caps text-sm text-primary">${formatCurrency(line.lineTotal, line.product.currency)}</p>
    `;
    container.appendChild(row);
  });
}

function renderSummarySidebar() {
  if (!els.summaryLines) return;
  renderCartLines(els.summaryLines, state.lines);

  const localSubtotal = state.lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const s = state.summary;

  els.summarySubtotal.textContent = formatCurrency(s ? s.subtotal : localSubtotal);
  els.summaryDiscount.textContent = s && s.discount > 0 ? `−${formatCurrency(s.discount)}` : '—';
  els.summaryShipping.textContent = s ? (s.shipping === 0 ? 'Free' : formatCurrency(s.shipping)) : '—';
  els.summaryTax.textContent = s ? formatCurrency(s.tax) : '—';
  els.summaryTotal.textContent = formatCurrency(s ? s.total : localSubtotal);
}

function renderReviewTotals() {
  const s = state.summary;
  if (!s || !els.reviewTotals) return;
  els.reviewTotals.innerHTML = `
    <div class="checkout-summary-row"><span>Subtotal</span><span>${formatCurrency(s.subtotal)}</span></div>
    ${s.discount > 0 ? `<div class="checkout-summary-row"><span>Discount</span><span>−${formatCurrency(s.discount)}</span></div>` : ''}
    <div class="checkout-summary-row"><span>Shipping</span><span>${s.shipping === 0 ? 'Free' : formatCurrency(s.shipping)}</span></div>
    <div class="checkout-summary-row"><span>Tax</span><span>${formatCurrency(s.tax)}</span></div>
    <div class="checkout-summary-row checkout-summary-row--total"><span>Total</span><span>${formatCurrency(s.total)}</span></div>
  `;
}

function renderReviewAddress() {
  if (!state.address || !els.reviewAddress) return;
  const a = state.address;
  els.reviewAddress.textContent = `${a.fullName}, ${a.line1}${a.line2 ? ', ' + a.line2 : ''}, ${a.city}, ${a.state} ${a.postalCode}, ${a.country} · ${a.phone}`;
}

// ---------- Step transitions ----------

async function goToStep(step) {
  state.step = step;
  renderStepper();
  showPanel(step);

  if (step === 'shipping') {
    const localSubtotal = state.lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const shippingCost = localSubtotal === 0 ? 0 : localSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : null;
    els.shippingCost.textContent = shippingCost === 0 ? 'Free' : 'Calculated at review';
    els.freeShippingThreshold.textContent = formatCurrency(FREE_SHIPPING_THRESHOLD);
  }

  if (step === 'review') {
    renderReviewAddress();
    await refreshSummary();
  }
}

async function refreshSummary() {
  if (!state.address) return;
  try {
    state.summary = await getSummary({ shippingAddress: state.address, couponCode: state.couponCode || undefined });
    if (els.couponMessage && state.couponCode) {
      els.couponMessage.textContent = state.summary.discount > 0 ? 'Coupon applied.' : 'Coupon code not valid for this order.';
    }
  } catch (err) {
    // Backend unreachable or otherwise erroring — fall back to a
    // client-computed estimate so review isn't just blank. This is only
    // ever a display fallback; the real totals are always recomputed
    // server-side before payment.
    const subtotal = state.lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 99;
    state.summary = { subtotal, discount: 0, shipping, tax: 0, total: subtotal + shipping, estimated: true };
    if (els.couponMessage) els.couponMessage.textContent = state.couponCode ? `Could not validate coupon: ${err.message}` : '';
  }
  renderReviewTotals();
  renderSummarySidebar();
}

function readAddressForm() {
  const formData = new FormData(els.addressForm);
  const address = {
    fullName: formData.get('fullName')?.trim(),
    line1: formData.get('line1')?.trim(),
    line2: formData.get('line2')?.trim() || undefined,
    city: formData.get('city')?.trim(),
    state: formData.get('state')?.trim(),
    postalCode: formData.get('postalCode')?.trim(),
    country: 'India',
    phone: formData.get('phone')?.trim(),
  };
  return {
    address,
    guestEmail: formData.get('guestEmail')?.trim(),
    guestPhone: formData.get('guestPhone')?.trim(),
  };
}

function validateAddressStep() {
  if (!els.addressForm.reportValidity()) return false;
  const { address, guestEmail, guestPhone } = readAddressForm();
  state.address = address;
  state.guestEmail = getAccessToken() ? undefined : guestEmail;
  state.guestPhone = getAccessToken() ? undefined : guestPhone;
  return true;
}

// ---------- Payment ----------

function buildCheckoutInput() {
  return {
    shippingAddress: state.address,
    billingSameAsShipping: true,
    couponCode: state.couponCode || undefined,
    guestEmail: state.guestEmail,
    guestPhone: state.guestPhone,
    notes: els.notes?.value?.trim() || undefined,
  };
}

async function handlePlaceOrder() {
  const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;
  els.placeOrderBtn.setAttribute('disabled', 'true');
  els.placeOrderBtn.textContent = 'Placing order…';
  hideError(els.paymentError);

  try {
    if (method === 'cod') {
      const { order } = await createCodOrder(buildCheckoutInput());
      onOrderPlaced(order);
      return;
    }

    if (typeof Razorpay === 'undefined') {
      throw new Error('Payment gateway failed to load. Please refresh and try again.');
    }

    const orderInit = await createRazorpayOrder(buildCheckoutInput());
    const razorpayCheckout = new Razorpay({
      key: orderInit.keyId,
      amount: orderInit.amount,
      currency: orderInit.currency,
      name: 'Guchhi',
      description: 'Wild-Foraged Food Products',
      image: 'media/logo.jpg',
      order_id: orderInit.razorpayOrderId,
      prefill: {
        name: state.address?.fullName,
        email: state.guestEmail,
        contact: state.address?.phone,
      },
      theme: { color: '#061b0e' },
      handler: async (response) => {
        try {
          const { order } = await verifyPayment({ checkoutId: orderInit.checkoutId, ...response });
          onOrderPlaced(order);
        } catch (err) {
          showError(els.paymentError, err.message);
          resetPlaceOrderButton();
        }
      },
      modal: {
        ondismiss: () => resetPlaceOrderButton(),
      },
    });
    razorpayCheckout.on('payment.failed', (response) => {
      showError(els.paymentError, response.error?.description || 'Payment failed. Please try again.');
      resetPlaceOrderButton();
    });
    razorpayCheckout.open();
  } catch (err) {
    showError(els.paymentError, err.message);
    resetPlaceOrderButton();
  }
}

function resetPlaceOrderButton() {
  els.placeOrderBtn.removeAttribute('disabled');
  els.placeOrderBtn.textContent = 'Place order';
}

function onOrderPlaced(order) {
  clearCart();
  clearAppliedCoupon();
  els.successNumber.textContent = order.orderNumber;
  state.step = 'success';
  els.stepper?.classList.add('hidden');
  showPanel('success');
}

function showError(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}
function hideError(el) {
  if (!el) return;
  el.classList.add('hidden');
}

// ---------- Wiring ----------

function bindNavigation() {
  document.querySelectorAll('[data-next]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const currentPanel = btn.closest('[data-panel]');
      const current = currentPanel?.dataset.panel;
      if (current === 'address' && !validateAddressStep()) return;
      const nextIndex = STEP_ORDER.indexOf(current) + 1;
      if (nextIndex < STEP_ORDER.length) await goToStep(STEP_ORDER[nextIndex]);
    });
  });

  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = btn.closest('[data-panel]')?.dataset.panel;
      const prevIndex = STEP_ORDER.indexOf(current) - 1;
      if (prevIndex >= 0) goToStep(STEP_ORDER[prevIndex]);
    });
  });

  document.querySelectorAll('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => goToStep(btn.dataset.goto));
  });

  els.couponApply?.addEventListener('click', async () => {
    state.couponCode = els.couponInput?.value?.trim() || '';
    await refreshSummary();
  });

  els.placeOrderBtn?.addEventListener('click', handlePlaceOrder);
}

async function init() {
  cacheElements();

  state.lines = await getDetailedCart();
  if (state.lines.length === 0) {
    els.emptyState.classList.remove('hidden');
    els.stepper?.classList.add('hidden');
    document.querySelectorAll('[data-panel]').forEach((p) => p.classList.add('hidden'));
    return;
  }

  renderCartLines(els.cartLines, state.lines);
  renderSummarySidebar();
  bindNavigation();

  // Carry over whatever coupon was applied in the cart sidebar so the
  // shopper doesn't have to re-type it here.
  const carriedCoupon = getAppliedCouponCode();
  if (carriedCoupon) {
    state.couponCode = carriedCoupon;
    if (els.couponInput) els.couponInput.value = carriedCoupon;
  }

  await goToStep('cart');

  const { unavailable } = await syncServerCart();
  if (unavailable.length > 0 && els.syncWarning) {
    els.syncWarning.textContent = `Some items could not be validated with our servers just now (${unavailable
      .map((u) => u.name)
      .join(', ')}). You can still continue — availability is re-checked before payment.`;
    els.syncWarning.classList.remove('hidden');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
