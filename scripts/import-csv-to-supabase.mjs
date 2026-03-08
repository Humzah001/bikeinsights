/**
 * Import CSV data from the data/ folder into Supabase tables.
 *
 * Prerequisites:
 * 1. Supabase tables exist (run supabase/migrations/001_initial_tables.sql first).
 * 2. .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run from project root:
 *   node --env-file=.env.local scripts/import-csv-to-supabase.mjs
 * Or (Windows PowerShell):
 *   Get-Content .env.local | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim().Trim('"'), 'Process') } }; node scripts/import-csv-to-supabase.mjs
 */

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  try {
    const content = fsSync.readFileSync(envPath, "utf8");
    content.split("\n").forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, "");
        process.env[key] = val;
      }
    });
  } catch {
    // --env-file may have been used, or env already set
  }
}

async function readCSV(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const result = Papa.parse(content, { header: true, skipEmptyLines: true });
    return result.data.filter((row) => Object.keys(row).some((k) => row[k] !== ""));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function row(table, raw) {
  const str = (v) => (v == null || v === "" ? "" : String(v).trim());
  switch (table) {
    case "bikes":
      return {
        id: str(raw.id) || undefined,
        name: str(raw.name),
        brand: str(raw.brand),
        model: str(raw.model),
        color: str(raw.color),
        serial_number: str(raw.serial_number),
        status: str(raw.status) || "available",
        purchase_date: str(raw.purchase_date),
        purchase_price: str(raw.purchase_price) || "0",
        weekly_rate: str(raw.weekly_rate) || "0",
        tracker_share_url: str(raw.tracker_share_url),
        image_filename: str(raw.image_filename),
        notes: str(raw.notes),
        created_at: str(raw.created_at) || undefined,
        last_latitude: raw.last_latitude != null && raw.last_latitude !== "" ? str(raw.last_latitude) : null,
        last_longitude: raw.last_longitude != null && raw.last_longitude !== "" ? str(raw.last_longitude) : null,
      };
    case "rentals":
      return {
        id: str(raw.id) || undefined,
        bike_id: str(raw.bike_id),
        bike_name: str(raw.bike_name),
        customer_name: str(raw.customer_name),
        customer_phone: str(raw.customer_phone),
        customer_email: str(raw.customer_email),
        start_date: str(raw.start_date),
        end_date: str(raw.end_date),
        weekly_rate: str(raw.weekly_rate) || "0",
        total_amount: str(raw.total_amount) || "0",
        amount_paid: str(raw.amount_paid ?? "") || "0",
        weeks: str(raw.weeks) || "0",
        status: str(raw.status) || "active",
        payment_status: str(raw.payment_status) || "pending",
        notes: str(raw.notes),
        created_at: str(raw.created_at) || undefined,
      };
    case "repairs":
      return {
        id: str(raw.id) || undefined,
        bike_id: str(raw.bike_id),
        bike_name: str(raw.bike_name),
        description: str(raw.description),
        repair_date: str(raw.repair_date),
        cost: str(raw.cost) || "0",
        repair_shop: str(raw.repair_shop),
        status: str(raw.status) || "pending",
        notes: str(raw.notes),
        created_at: str(raw.created_at) || undefined,
      };
    case "expenses":
      return {
        id: str(raw.id) || undefined,
        bike_id: str(raw.bike_id),
        bike_name: str(raw.bike_name),
        category: str(raw.category) || "other",
        description: str(raw.description),
        amount: str(raw.amount) || "0",
        date: str(raw.date),
        receipt_filename: str(raw.receipt_filename),
        notes: str(raw.notes),
        created_at: str(raw.created_at) || undefined,
      };
    case "notifications":
      return {
        id: str(raw.id) || undefined,
        type: str(raw.type) || "payment_pending",
        bike_id: str(raw.bike_id),
        bike_name: str(raw.bike_name),
        rental_id: str(raw.rental_id),
        customer_name: str(raw.customer_name),
        customer_phone: str(raw.customer_phone),
        message: str(raw.message),
        is_read: str(raw.is_read) || "false",
        created_at: str(raw.created_at) || undefined,
      };
    default:
      return raw;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set in .env.local or use node --env-file=.env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const tables = [
    { file: "bikes.csv", table: "bikes" },
    { file: "rentals.csv", table: "rentals" },
    { file: "repairs.csv", table: "repairs" },
    { file: "expenses.csv", table: "expenses" },
    { file: "notifications.csv", table: "notifications" },
  ];

  for (const { file, table } of tables) {
    const rawRows = await readCSV(file);
    const rows = rawRows
      .map((r) => row(table, r))
      .filter((r) => r.id != null && r.id !== "");
    if (rows.length === 0) {
      console.log(`${file} → ${table}: no rows (file missing or empty)`);
      continue;
    }
    const { data, error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) {
      console.error(`${file} → ${table}:`, error.message);
      process.exit(1);
    }
    console.log(`${file} → ${table}: ${rows.length} row(s) imported`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
