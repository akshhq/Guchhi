const wrapper = (title: string, body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: Georgia, serif; background:#f7f4ef; padding:32px; color:#2b2521;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e7e0d6;">
    <h2 style="color:#3c5c3f;margin-top:0;">Guchhi</h2>
    ${body}
    <p style="margin-top:32px;font-size:12px;color:#8a8175;">Wild-foraged from the Himalayas, delivered to your door.</p>
  </div>
</body>
</html>`;

export const welcomeEmail = (name: string) =>
  wrapper('Welcome to Guchhi', `<p>Hi ${name},</p><p>Welcome to Guchhi! We're glad to have you.</p>`);

export const verifyEmailTemplate = (name: string, link: string) =>
  wrapper('Verify your email', `<p>Hi ${name},</p><p>Please verify your email address:</p><p><a href="${link}">Verify Email</a></p><p>This link expires in 24 hours.</p>`);

export const resetPasswordEmail = (name: string, link: string) =>
  wrapper('Reset your password', `<p>Hi ${name},</p><p>We received a request to reset your password. Click below to continue:</p><p><a href="${link}">Reset Password</a></p><p>If you didn't request this, you can ignore this email. This link expires in 1 hour.</p>`);

export const orderConfirmationEmail = (name: string, orderNumber: string, total: string) =>
  wrapper('Order Confirmed', `<p>Hi ${name},</p><p>Your order <strong>${orderNumber}</strong> has been confirmed. Total: <strong>₹${total}</strong>.</p><p>We'll notify you when it ships.</p>`);

export const paymentConfirmationEmail = (name: string, orderNumber: string, amount: string) =>
  wrapper('Payment Received', `<p>Hi ${name},</p><p>We've received your payment of <strong>₹${amount}</strong> for order <strong>${orderNumber}</strong>.</p>`);

export const shippingUpdateEmail = (name: string, orderNumber: string, status: string) =>
  wrapper('Order Update', `<p>Hi ${name},</p><p>Your order <strong>${orderNumber}</strong> status has been updated to: <strong>${status}</strong>.</p>`);

export const invoiceEmail = (name: string, orderNumber: string) =>
  wrapper('Your Invoice', `<p>Hi ${name},</p><p>Please find attached the invoice for your order <strong>${orderNumber}</strong>.</p>`);

/** Sent to the business (env.CONTACT_NOTIFY_EMAIL) when someone submits the trade/bulk enquiry form. */
export const tradeEnquiryNotification = (input: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
}) =>
  wrapper(
    'New Trade Enquiry',
    `<p>New enquiry from the website contact form:</p>
     <p><strong>Name:</strong> ${input.name}<br/>
     <strong>Email:</strong> ${input.email}<br/>
     ${input.phone ? `<strong>Phone:</strong> ${input.phone}<br/>` : ''}
     ${input.company ? `<strong>Company:</strong> ${input.company}<br/>` : ''}</p>
     <p><strong>Message:</strong></p>
     <p style="white-space:pre-wrap;">${input.message}</p>`
  );

/** Sent back to the person who submitted the enquiry, confirming receipt. */
export const tradeEnquiryConfirmation = (name: string) =>
  wrapper(
    "We've received your enquiry",
    `<p>Hi ${name},</p>
     <p>Thanks for reaching out to Guchhi. We've received your enquiry and one of our team
     will get back to you shortly.</p>`
  );
