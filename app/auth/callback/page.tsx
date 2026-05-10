"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { isPlausibleInviteRawToken } from "@/lib/invite-token-format";

/**
 * Stable URL for Supabase Auth redirects after invite / magic links.
 * Redirect URLs must allowlist this path — use a wildcard so query strings work, e.g.
 * https://YOUR_DOMAIN/auth/callback** (Supabase Dashboard → Authentication → URL Configuration).
 */
function AuthCallbackInner() {
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    const sb = createBrowserSupabase();
    if (!sb) {
      setError("Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (Supabase → Settings → API → anon key).");
      return;
    }

    const tryContinue = () => {
      if (doneRef.current) return;

      void sb.auth.getSession().then(({ data: { session } }) => {
        if (doneRef.current) return;

        const origin = window.location.origin;
        const search = window.location.search;
        const hash = window.location.hash;

        const qp = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
        const tokenFromQuery = qp.get("invite_token")?.trim() ?? "";
        const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
        const tokenFromMeta = typeof meta?.app_invite_token === "string" ? meta.app_invite_token.trim() : "";

        const appToken =
          tokenFromQuery && isPlausibleInviteRawToken(tokenFromQuery)
            ? tokenFromQuery
            : tokenFromMeta && isPlausibleInviteRawToken(tokenFromMeta)
              ? tokenFromMeta
              : "";

        const hasUrlAuth =
          Boolean(session?.access_token) || hash.includes("access_token") || search.includes("code=");

        if (!hasUrlAuth && !session?.user) {
          return;
        }

        if (!appToken) {
          doneRef.current = true;
          setError(
            "Could not read your workspace invite link (missing token). Ask an admin to send a new invite from Platform admin, and confirm Supabase Redirect URLs include https://your-domain/auth/callback with a wildcard so query parameters are allowed."
          );
          return;
        }

        doneRef.current = true;
        qp.delete("invite_token");
        const restQuery = qp.toString();
        let dest = `${origin}/invite/accept?token=${encodeURIComponent(appToken)}`;
        if (restQuery) dest += `&${restQuery}`;
        dest += hash;
        window.location.replace(dest);
      });
    };

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        tryContinue();
      }
    });

    tryContinue();

    const timer = window.setTimeout(() => tryContinue(), 800);
    const timer2 = window.setTimeout(() => {
      if (!doneRef.current) {
        setError(
          "Timed out reading your Supabase session. Confirm Redirect URLs include this page (e.g. http://localhost:3001/auth/callback and https://your-domain/auth/callback)."
        );
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
    };
  }, []);

  if (error) {
    return (
      <Card className="w-full max-w-md border-destructive/50">
        <CardHeader>
          <CardTitle>Invite link issue</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Completing invitation…</CardTitle>
        <CardDescription>Connecting your Supabase sign-in to your workspace.</CardDescription>
      </CardHeader>
    </Card>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
        <AuthCallbackInner />
      </Suspense>
    </div>
  );
}
