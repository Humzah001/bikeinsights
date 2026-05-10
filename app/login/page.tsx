"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bike } from "lucide-react";
import { toast } from "sonner";
import { SupabaseInviteFromHash } from "@/app/login/SupabaseInviteFromHash";
import { userFacingApiError } from "@/lib/user-facing-error";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const timedOut = searchParams.get("reason") === "timeout";
  const workspaceBlocked = searchParams.get("reason") === "workspace_blocked";
  const workspaceBlockedDetail = searchParams.get("detail")?.trim() ?? "";
  const invited = searchParams.get("invited") === "1";

  useEffect(() => {
    if (!invited) return;
    const raw = searchParams.get("email");
    if (!raw?.trim()) return;
    try {
      setEmail(decodeURIComponent(raw.trim()));
    } catch {
      setEmail(raw.trim());
    }
  }, [invited, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase() || undefined,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 402 && data?.error) {
          toast.error(userFacingApiError(data.error, "Your workspace is not available to sign in right now."));
          return;
        }
        toast.error(userFacingApiError(data.error, "Sign in failed"));
        return;
      }
      toast.success("Signed in");
      router.push(from);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SupabaseInviteFromHash>
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bike className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">My Bike Insights</CardTitle>
          <CardDescription>
            Sign in with your work email and the password you set when you joined. If your organization uses a shared
            access option, follow the instructions they gave you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timedOut ? (
            <Alert className="mb-4" variant="default">
              <AlertDescription>
                You were signed out after 15 minutes of inactivity. Sign in again to continue.
              </AlertDescription>
            </Alert>
          ) : null}
          {workspaceBlocked && workspaceBlockedDetail ? (
            <Alert className="mb-4" variant="destructive">
              <AlertDescription>
                {userFacingApiError(
                  workspaceBlockedDetail,
                  "Your workspace is not available to sign in right now."
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          {invited ? (
            <Alert className="mb-4" variant="default">
              <AlertDescription>
                Your workspace is ready. Sign in below using the same email as your invitation and the password you
                just created.
              </AlertDescription>
            </Alert>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus={!email}
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </SupabaseInviteFromHash>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6">Loading…</CardContent>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
