#!/usr/bin/env node
/**
 * Push BikeInsights invite HTML to your hosted Supabase project (replaces dashboard template).
 *
 * Requires:
 *   - SUPABASE_ACCESS_TOKEN from https://supabase.com/dashboard/account/tokens
 *   - SUPABASE_PROJECT_REF from Dashboard URL: /dashboard/project/<ref>/...
 *
 * Usage:
 *   node --env-file=.env.local scripts/push-supabase-invite-template.mjs
 *
 * Optional env:
 *   INVITE_EMAIL_SUBJECT (default: You're invited to BikeInsights)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const templatePath = path.join(root, "supabase/email-templates/invite-user-body-only.html");

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;
const subject = process.env.INVITE_EMAIL_SUBJECT ?? "You're invited to BikeInsights";

if (!token || !ref) {
  console.error("Missing env: SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF");
  console.error("Token: https://supabase.com/dashboard/account/tokens");
  console.error("Ref:   Dashboard → Project Settings → General → Reference ID");
  process.exit(1);
}

const mailer_templates_invite_content = fs.readFileSync(templatePath, "utf8");

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    mailer_subjects_invite: subject,
    mailer_templates_invite_content,
  }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}

console.log("Invite email template updated:", subject);
console.log(text.slice(0, 500));
