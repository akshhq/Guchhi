/**
 * accountUI.js
 * Presentation only, mirroring cartUI.js's split from cartService.js: every
 * mutation (login/signup/logout) is delegated to authService — this file
 * never touches the token or localStorage directly.
 *
 * Panel has three views: 'login', 'signup', and 'profile' (shown once
 * signed in). It re-renders on window's `auth:changed` event so it always
 * reflects current sign-in state, even if another tab or the checkout flow
 * changes it.
 */

import { login, signup, logout, getCurrentUser, isLoggedIn } from '../services/authService.js';

let els = {};
let view = 'login';
let submitting = false;

function cacheElements() {
  els = {
    toggleButtons: document.querySelectorAll('[data-account-open]'),
    closeButtons: document.querySelectorAll('[data-account-close]'),
    overlay: document.getElementById('account-overlay'),
    sidebar: document.getElementById('account-sidebar'),
    body: document.getElementById('account-sidebar-body'),
  };
}

function open() {
  if (!els.sidebar) return;
  els.overlay.classList.add('account-overlay--visible');
  els.sidebar.classList.add('account-sidebar--open');
  els.sidebar.setAttribute('aria-hidden', 'false');
  render();
}

function close() {
  if (!els.sidebar) return;
  els.overlay.classList.remove('account-overlay--visible');
  els.sidebar.classList.remove('account-sidebar--open');
  els.sidebar.setAttribute('aria-hidden', 'true');
}

function renderAuthForm() {
  const isLogin = view === 'login';
  els.body.innerHTML = `
    <div class="account-tabs" role="tablist">
      <button type="button" class="account-tab" role="tab" data-tab="login" aria-selected="${isLogin}">Sign In</button>
      <button type="button" class="account-tab" role="tab" data-tab="signup" aria-selected="${!isLogin}">Create Account</button>
    </div>
    <form class="account-form" id="account-form" novalidate>
      ${
        isLogin
          ? ''
          : `<div class="account-field">
              <label for="account-first-name">First name</label>
              <input id="account-first-name" name="firstName" type="text" autocomplete="given-name" required />
            </div>`
      }
      <div class="account-field">
        <label for="account-email">Email</label>
        <input id="account-email" name="email" type="email" autocomplete="email" required />
      </div>
      <div class="account-field">
        <label for="account-password">Password</label>
        <input id="account-password" name="password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}" minlength="8" required />
      </div>
      <p class="account-error" id="account-error" role="alert"></p>
      <button type="submit" class="account-submit" id="account-submit">${isLogin ? 'Sign In' : 'Create Account'}</button>
      ${isLogin ? '<button type="button" class="account-forgot-link" id="account-forgot-link">Forgot password?</button>' : ''}
    </form>
  `;

  els.body.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      view = btn.dataset.tab;
      els.body.classList.add('account-sidebar-body--transitioning');
      setTimeout(() => {
        renderAuthForm();
        els.body.classList.remove('account-sidebar-body--transitioning');
      }, 120);
    });
  });

  const form = document.getElementById('account-form');
  form.addEventListener('submit', handleAuthSubmit);

  const forgotLink = document.getElementById('account-forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', () => {
      view = 'forgot';
      renderForgotForm();
    });
  }
}

function renderForgotForm() {
  els.body.innerHTML = `
    <p class="font-body-md text-sm text-on-surface-variant mb-md">Enter the email on your account and we'll send you a reset link.</p>
    <form class="account-form" id="account-forgot-form" novalidate>
      <div class="account-field">
        <label for="account-forgot-email">Email</label>
        <input id="account-forgot-email" name="email" type="email" autocomplete="email" required />
      </div>
      <p class="account-error" id="account-error" role="alert"></p>
      <button type="submit" class="account-submit" id="account-submit">Send Reset Link</button>
      <button type="button" class="account-forgot-link" id="account-back-link">Back to sign in</button>
    </form>
  `;

  document.getElementById('account-back-link').addEventListener('click', () => {
    view = 'login';
    renderAuthForm();
  });

  document.getElementById('account-forgot-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const { forgotPassword } = await import('../services/authService.js');
    const email = event.target.email.value.trim();
    const errorEl = document.getElementById('account-error');
    const submitBtn = document.getElementById('account-submit');
    submitBtn.disabled = true;
    const result = await forgotPassword(email);
    submitBtn.disabled = false;
    errorEl.style.color = result.success ? '#3f6b3f' : '#a3402c';
    errorEl.textContent = result.message;
  });
}

function renderProfile(user) {
  const initial = (user?.firstName || user?.email || '?').charAt(0).toUpperCase();
  els.body.innerHTML = `
    <div class="account-profile">
      <div class="account-profile-avatar">${initial}</div>
      <p class="account-profile-name">${[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Welcome back'}</p>
      <p class="account-profile-email">${user?.email ?? ''}</p>
      <button type="button" class="account-logout-btn" id="account-logout-btn">Sign Out</button>
    </div>
  `;

  document.getElementById('account-logout-btn').addEventListener('click', async () => {
    await logout();
    view = 'login';
    render();
  });
}

async function render() {
  if (!els.body) return;

  const applyView = async () => {
    if (isLoggedIn()) {
      const user = await getCurrentUser();
      if (user) {
        renderProfile(user);
        return;
      }
      // Token existed but turned out to be invalid/expired (getCurrentUser
      // already cleared it) — fall through to the sign-in view.
    }

    if (view === 'forgot') {
      renderForgotForm();
    } else {
      renderAuthForm();
    }
  };

  // Brief cross-fade instead of an abrupt content swap when switching
  // between login/signup/profile.
  els.body.classList.add('account-sidebar-body--transitioning');
  await new Promise((resolve) => setTimeout(resolve, 120));
  await applyView();
  els.body.classList.remove('account-sidebar-body--transitioning');
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  if (submitting) return;

  const form = event.target;
  const errorEl = document.getElementById('account-error');
  const submitBtn = document.getElementById('account-submit');
  errorEl.textContent = '';
  errorEl.style.color = '';

  const email = form.email.value.trim();
  const password = form.password.value;

  submitting = true;
  submitBtn.disabled = true;

  const result =
    view === 'login'
      ? await login(email, password)
      : await signup({
          firstName: form.firstName?.value.trim(),
          email,
          password,
        });

  submitting = false;
  submitBtn.disabled = false;

  if (!result.success) {
    errorEl.textContent = result.message;
    return;
  }

  render();
}

async function updateNavIndicator() {
  const user = isLoggedIn() ? await getCurrentUser() : null;
  els.toggleButtons.forEach((btn) => {
    const icon = btn.querySelector('.material-symbols-outlined');
    if (user) {
      if (icon) icon.style.fontVariationSettings = "'FILL' 1";
      btn.setAttribute('aria-label', `Account — signed in as ${user.firstName || user.email}`);
    } else {
      if (icon) icon.style.fontVariationSettings = "'FILL' 0";
      btn.setAttribute('aria-label', 'Account');
    }
  });
}

export function initAccount() {
  cacheElements();
  if (!els.sidebar) return; // page doesn't include the account panel markup

  els.toggleButtons.forEach((btn) => btn.addEventListener('click', open));
  els.closeButtons.forEach((btn) => btn.addEventListener('click', close));
  els.overlay?.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  window.addEventListener('auth:changed', () => {
    view = 'login';
    updateNavIndicator();
    if (els.sidebar.classList.contains('account-sidebar--open')) render();
  });

  updateNavIndicator();
}
