/**
 * enquiryForm.js
 * Submits the trade/bulk enquiry form to the real backend endpoint
 * (POST /contact/enquiry — see backend/src/controllers/contact.controller.ts),
 * which emails the enquiry to the business and a confirmation to the sender.
 * On success, redirects to thank-you.html so there's a clear, indexable
 * confirmation step rather than just an inline message.
 */
import { api, ApiError } from '../services/apiClient.js';

function initEnquiryForm() {
  const form = document.getElementById('enquiry-form');
  if (!form) return;

  const submitBtn = document.getElementById('enquiry-submit');
  const errorEl = document.getElementById('enquiry-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim() || undefined,
      company: form.company.value.trim() || undefined,
      message: form.message.value.trim(),
      website: form.website.value, // honeypot — always empty for real users
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      await api.post('/contact/enquiry', payload, { auth: false });
      window.location.href = 'thank-you.html';
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Enquiry';
      errorEl.textContent =
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
    }
  });
}

initEnquiryForm();
