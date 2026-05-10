"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Browser client for parsing invite/magic-link redirects (anon key). */
export function createBrowserSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: {
      detectSessionInUrl: true,
      /** Needed so /login → /invite/accept keeps the session when the URL no longer carries hash/query. */
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "bikeinsights-supabase-auth",
    },
  });
}
