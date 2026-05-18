import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || "onboarding@resend.dev";

const LEAD_INBOX_EMAIL = process.env.LEAD_INBOX_EMAIL || "hamza@mybikeinsights.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendLeadInquiryEmail(payload: {
  name: string;
  email: string;
  shopName?: string;
  phone?: string;
  plan: string;
  message?: string;
}) {
  if (!resend) {
    console.warn("Resend not configured. Set RESEND_API_KEY.");
    return { ok: false as const, error: "Email not configured" };
  }
  const { name, email, shopName, phone, plan, message } = payload;
  const subject = `My Bike Insights – Lead: ${plan} – ${name}`;
  const html = `
    <h1 style="font-family:system-ui,sans-serif;font-size:18px;">New website inquiry</h1>
    <table style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Plan</td><td>${escapeHtml(plan)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Name</td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Email</td><td>${escapeHtml(email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Shop</td><td>${escapeHtml(shopName || "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-weight:600;">Phone</td><td>${escapeHtml(phone || "—")}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;vertical-align:top;font-weight:600;">Message</td><td>${escapeHtml(message || "—").replace(/\n/g, "<br/>")}</td></tr>
    </table>
  `;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [LEAD_INBOX_EMAIL],
    replyTo: email,
    subject,
    html,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function sendReminderEmail(params: {
  to: string;
  customerName: string;
  bikeName: string;
  amountOwed: string;
  startDate: string;
  endDate: string;
}) {
  if (!resend) {
    console.warn("Resend not configured. Set RESEND_API_KEY.");
    return { ok: false, error: "Email not configured" };
  }
  const { to, customerName, bikeName, amountOwed, startDate, endDate } = params;
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject: `My Bike Insights – Payment reminder: ${bikeName}`,
    html: `
      <p>Hi ${customerName},</p>
      <p>This is a friendly reminder about your bike rental.</p>
      <p><strong>Bike:</strong> ${bikeName}</p>
      <p><strong>Rental period:</strong> ${startDate} to ${endDate}</p>
      <p><strong>Amount owed:</strong> ${amountOwed}</p>
      <p>Please arrange payment at your earliest convenience.</p>
      <p>Thank you,<br/>My Bike Insights</p>
    `,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
