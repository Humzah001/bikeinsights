import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || "onboarding@resend.dev";

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
