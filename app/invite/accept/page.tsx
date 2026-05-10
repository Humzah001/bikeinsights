"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { normalizePhoneDigits } from "@/lib/phone-normalize";
import { userFacingApiError } from "@/lib/user-facing-error";
import { ThemeToggleCorner } from "@/components/ThemeToggle";

function AcceptForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const sb = createBrowserSupabase();
    if (!sb) {
      return;
    }
    void sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setAccessToken(session.access_token);
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) setAccessToken(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("This invite link is incomplete. Open the full link from your invitation email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password and confirmation must match.");
      return;
    }
    if (displayName.trim().length < 2) {
      toast.error("Enter your full name (at least 2 characters).");
      return;
    }
    if (normalizePhoneDigits(phone).length < 8) {
      toast.error("Enter a valid phone number (at least 8 digits).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
          displayName,
          phone,
          ...(accessToken ? { access_token: accessToken } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data?.error) {
          toast.error(userFacingApiError(data.error, "Your workspace is not available yet."));
          return;
        }
        toast.error(userFacingApiError(data.error, "Could not complete invitation"));
        return;
      }

      const sb = createBrowserSupabase();
      await sb?.auth.signOut();

      toast.success("Welcome — opening your workspace.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const passwordsOk = password.length >= 8 && password === confirmPassword;
  const nameOk = displayName.trim().length >= 2;
  const phoneOk = normalizePhoneDigits(phone).length >= 8;
  const formOk = passwordsOk && nameOk && phoneOk;

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invalid link</CardTitle>
          <CardDescription>Use the complete invitation link from your email.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set up your account</CardTitle>
        <CardDescription>
          {accessToken
            ? "Your email is verified. Choose how your name and phone appear in the workspace, then set your My Bike Insights password."
            : "Choose how your name and phone appear in the workspace, then set your My Bike Insights password. If you used the invitation email link, your browser should connect automatically."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              required
              minLength={2}
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              placeholder="How you want to appear in the app"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Your phone number</Label>
            <Input
              id="phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              placeholder="Mobile or contact number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Re-enter your password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !formOk}>
            {loading ? "Continuing…" : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function InviteAcceptPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <ThemeToggleCorner />
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <AcceptForm />
      </Suspense>
    </div>
  );
}
