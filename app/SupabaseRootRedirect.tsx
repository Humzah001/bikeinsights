"use client";

import { useLayoutEffect } from "react";

/**
 * Supabase invite verification often redirects to Site URL (`/`) with `#access_token=…` in the fragment.
 * Fragments are not sent to the server, so middleware cannot see them; we forward hash (and PKCE `code` query)
 * to `/auth/callback` before paint when possible.
 */
export function SupabaseRootRedirect() {
  useLayoutEffect(() => {
    const origin = window.location.origin;
    const search = window.location.search;
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("refresh_token") || search.includes("code=")) {
      window.location.replace(`${origin}/auth/callback${search}${hash}`);
    }
  }, []);
  return null;
}
