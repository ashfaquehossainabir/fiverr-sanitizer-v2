function getClientUrl() {
  const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");
  return origins[0].trim();
}

export function buildVerificationEmail({ name, email, rawToken }) {
  const verifyUrl = `${getClientUrl()}/verify-email/${rawToken}`;

  return {
    to: email,
    subject: "Verify your email — Fiverr Sanitizer",
    text: `Hi ${name},

Thanks for creating a Fiverr Sanitizer account. Please verify your email address by visiting the link below:

${verifyUrl}

This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #16241d;">
        <h2 style="margin-bottom: 4px;">Verify your email</h2>
        <p>Hi ${name},</p>
        <p>Thanks for creating a Fiverr Sanitizer account. Please confirm your email address to finish setting up your account.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background:#0E9F6E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
            Verify my email
          </a>
        </p>
        <p style="font-size: 13px; color: #4C5F58;">Or paste this link into your browser:<br />${verifyUrl}</p>
        <p style="font-size: 13px; color: #4C5F58;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
      </div>
    `
  };
}

export default buildVerificationEmail;
