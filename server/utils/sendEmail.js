import nodemailer from "nodemailer";

let cachedTransporter;

/**
 * Lazily builds (and caches) the SMTP transporter from env vars.
 * Returns null when SMTP isn't configured, so the app still runs
 * locally without real email credentials.
 */
function getTransporter() {
  if (cachedTransporter !== undefined) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    cachedTransporter = null;
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for port 465, false for 587/25
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  return cachedTransporter;
}

/**
 * Sends an email, or logs it to the console when SMTP isn't configured
 * (e.g. local dev) so the verification flow can still be exercised
 * end-to-end without a real mail provider.
 */
export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || "Fiverr Sanitizer <no-reply@fiverr-sanitizer.local>";
  const transporter = getTransporter();

  if (!transporter) {
    console.log("\n----- EMAIL NOT SENT: SMTP not configured, logging instead -----");
    console.log(`From:    ${from}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html);
    console.log("-------------------------------------------------------------------\n");
    return { delivered: false };
  }

  await transporter.sendMail({ from, to, subject, html, text });
  return { delivered: true };
}

export default sendEmail;
