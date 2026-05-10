"use client";

import { useEffect } from "react";

/**
 * OAuth / invite fragments on /login are forwarded to /auth/callback (single handler).
 */
export function SupabaseInviteFromHash({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const search = window.location.search;
    const looksLikeAuthReturn =
      hash.includes("access_token") ||
      hash.includes("refresh_token") ||
      search.includes("code=");
    if (!looksLikeAuthReturn) return;
    window.location.replace(`${window.location.origin}/auth/callback${search}${hash}`);
  }, []);

  return <>{children}</>;
}
