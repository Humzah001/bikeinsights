"use client";

import { useEffect } from "react";

/**
 * Supabase invite verification often redirects to Site URL (`/`) with `#access_token=…` in the fragment.
 * Fragments are not sent to the server, so middleware cannot see them; a server redirect to `/login` would
 * drop the hash. We briefly render this page to forward hash (and PKCE `code` query) to `/login`.
 */
export default function HomePage() {
  useEffect(() => {
    const origin = window.location.origin;
    const search = window.location.search;
    const hash = window.location.hash;

    if (hash.includes("access_token") || hash.includes("refresh_token") || search.includes("code=")) {
      window.location.replace(`${origin}/auth/callback${search}${hash}`);
      return;
    }

    window.location.replace("/login");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <p className="text-muted-foreground text-sm">Redirecting…</p>
    </div>
  );
}
