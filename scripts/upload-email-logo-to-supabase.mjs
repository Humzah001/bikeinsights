#!/usr/bin/env node
/**
 * Upload public/email/bikeinsights-logo.svg to Supabase Storage (bucket email-assets).
 * Run after migration 012_storage_email_assets_bucket.sql.
 *
 *   npm run storage:upload-email-logo
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional: INVITE_EMAIL_LOGO_BUCKET (default email-assets), INVITE_EMAIL_LOGO_OBJECT_PATH (default bikeinsights-logo.svg)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = process.env.INVITE_EMAIL_LOGO_BUCKET?.trim() || "email-assets";
const objectPath = (process.env.INVITE_EMAIL_LOGO_OBJECT_PATH?.trim() || "bikeinsights-logo.svg").replace(/^\/+/, "");

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const localFile = path.join(root, "public", "email", "bikeinsights-logo.svg");
if (!fs.existsSync(localFile)) {
  console.error("Missing file:", localFile);
  process.exit(1);
}

const bytes = fs.readFileSync(localFile);
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
  contentType: "image/svg+xml",
  upsert: true,
});

if (error) {
  console.error("Upload failed:", error.message);
  process.exit(1);
}

const publicUrl = `${url.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath}`;
console.log("Uploaded OK:", `${bucket}/${objectPath}`);
console.log("Public URL:", publicUrl);
console.log("Invite emails use this URL when INVITE_EMAIL_LOGO_URL is unset (see lib/invite-email-logo.ts).");
