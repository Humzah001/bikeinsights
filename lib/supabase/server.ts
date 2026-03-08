import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createSupabase(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local)."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

let _supabase: SupabaseClient | null = null;

/** Use this in API routes and server code. Lazy-init so env is only required when DB is used. */
export function getSupabase(): SupabaseClient {
  if (!_supabase) _supabase = createSupabase();
  return _supabase;
}
