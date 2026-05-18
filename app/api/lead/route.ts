import { NextResponse } from "next/server";
import { z } from "zod";
import { sendLeadInquiryEmail } from "@/lib/email";

const bodySchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required").max(254),
  shopName: z.string().max(200).optional().transform((s) => s?.trim() || undefined),
  phone: z.string().max(40).optional().transform((s) => s?.trim() || undefined),
  plan: z.enum(["trial", "monthly", "unsure"]),
  message: z.string().max(2000).optional().transform((s) => s?.trim() || undefined),
  /** Honeypot — must be empty */
  website: z.string().max(100).optional(),
});

const PLAN_LABEL: Record<string, string> = {
  trial: "15-day trial",
  monthly: "Workspace monthly (€150)",
  unsure: "Not sure yet",
};

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { name, email, shopName, phone, plan, message, website } = parsed.data;
    if (website && website.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const result = await sendLeadInquiryEmail({
      name,
      email,
      shopName,
      phone,
      plan: PLAN_LABEL[plan] ?? plan,
      message,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error === "Email not configured" ? "Server email is not configured." : result.error },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
