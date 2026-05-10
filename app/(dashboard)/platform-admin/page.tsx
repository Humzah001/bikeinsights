"use client";

import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_TRIAL_DAYS } from "@/lib/buildit4me-tenant";
import { normalizePhoneDigits } from "@/lib/phone-normalize";
import { userFacingApiError } from "@/lib/user-facing-error";
import { cn } from "@/lib/utils";

type InvitationRow = {
  id: string;
  tenant_id: string;
  email: string;
  invitee_name?: string;
  invitee_phone?: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  billing_status: string;
  notes: string;
  trial_ends_at: string | null;
  access_paused: boolean;
  paid_access_ends_at: string | null;
  created_at: string;
  members: { user_id: string; email: string; display_name: string; phone?: string; role: string }[];
  invitations: InvitationRow[];
};

function InvitesMenu({
  invitations,
  members,
  onRevoke,
}: {
  invitations: InvitationRow[];
  members: TenantRow["members"];
  onRevoke: (id: string) => void;
}) {
  const list = invitations ?? [];
  if (!list.length) return <span className="text-muted-foreground">—</span>;
  const pending = list.filter((i) => !i.accepted_at).length;
  const label = pending > 0 ? `${pending} pending` : `${list.length} invite${list.length === 1 ? "" : "s"}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 max-w-[10rem] truncate font-normal"
        )}
      >
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-[min(calc(100vw-2rem),22rem)] overflow-y-auto">
        <DropdownMenuLabel>Invitations</DropdownMenuLabel>
        {list.map((inv) => {
          const accepted = Boolean(inv.accepted_at);
          const expired = !accepted && new Date(inv.expires_at) < new Date();
          const variant = accepted ? "default" : expired ? "outline" : "secondary";
          const statusLabel = accepted ? "Accepted" : expired ? "Expired" : "Pending";
          const emailKey = inv.email.trim().toLowerCase();
          const memberProfile = accepted
            ? members.find((m) => m.email.trim().toLowerCase() === emailKey)
            : undefined;
          return (
            <div key={inv.id} className="border-b border-border px-2 py-2 last:border-0">
              <div className="break-all text-xs font-medium">{inv.email}</div>
              {inv.invitee_name || inv.invitee_phone ? (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">Contact at invite:</span>{" "}
                  {[inv.invitee_name, inv.invitee_phone].filter(Boolean).join(" · ") || "—"}
                </div>
              ) : null}
              {accepted && memberProfile ? (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/80">Profile they chose:</span>{" "}
                  {[memberProfile.display_name || "—", memberProfile.phone?.trim() || "—"].join(" · ")}
                </div>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <Badge variant={variant} className="text-[10px]">
                  {statusLabel}
                </Badge>
                {!accepted ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onRevoke(inv.id)}
                  >
                    Revoke
                  </Button>
                ) : null}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {accepted && inv.accepted_at
                  ? `Accepted ${format(new Date(inv.accepted_at), "PP")}`
                  : expired
                    ? `Expired ${format(new Date(inv.expires_at), "PP")}`
                    : `Expires ${format(new Date(inv.expires_at), "PP")}`}
              </p>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MembersMenu({
  members,
  tenantId,
  onRemove,
}: {
  members: TenantRow["members"];
  tenantId: string;
  onRemove: (tenantId: string, userId: string) => void;
}) {
  const list = members ?? [];
  if (!list.length) return <span className="text-muted-foreground">—</span>;
  const label = `${list.length} member${list.length === 1 ? "" : "s"}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "h-8 max-w-[10rem] truncate font-normal"
        )}
      >
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-[min(calc(100vw-2rem),22rem)] overflow-y-auto">
        <DropdownMenuLabel>Members</DropdownMenuLabel>
        {list.map((m) => (
          <div key={m.user_id} className="border-b border-border px-2 py-2 last:border-0">
            <div className="break-all text-xs font-medium">{m.email}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/80">Name:</span> {m.display_name.trim() || "—"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground/80">Phone:</span>{" "}
              {m.phone?.trim() || "—"}
            </div>
            <div className="text-[10px] text-muted-foreground">Role: {m.role}</div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => onRemove(tenantId, m.user_id)}
            >
              Remove from workspace
            </Button>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function PlatformAdminPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTenantName, setInviteTenantName] = useState("");
  const [inviteOwnerName, setInviteOwnerName] = useState("");
  const [inviteOwnerPhone, setInviteOwnerPhone] = useState("");
  const [inviteBilling, setInviteBilling] = useState<"trial" | "active">("trial");
  const [inviteTrialDays, setInviteTrialDays] = useState("");
  const [invitePaidDays, setInvitePaidDays] = useState("");
  const [inviting, setInviting] = useState(false);
  const [grantDaysByTenant, setGrantDaysByTenant] = useState<Record<string, string>>({});

  async function load(opts?: { silent?: boolean }) {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/platform-admin/tenants");
      if (!res.ok) throw new Error();
      const rows: TenantRow[] = await res.json();
      setTenants(
        rows.map((row) => ({
          ...row,
          invitations: row.invitations ?? [],
          members: row.members ?? [],
          access_paused: Boolean(row.access_paused),
          paid_access_ends_at: row.paid_access_ends_at ?? null,
        }))
      );
    } catch {
      toast.error("Could not load workspaces");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (inviteOwnerName.trim().length < 2) {
      toast.error("Enter a reference contact name for this invite.");
      return;
    }
    if (normalizePhoneDigits(inviteOwnerPhone).length < 8) {
      toast.error("Enter a reference phone number with at least 8 digits.");
      return;
    }
    setInviting(true);
    try {
      const payload: Record<string, unknown> = {
        email: inviteEmail,
        tenantName: inviteTenantName,
        inviteeName: inviteOwnerName.trim(),
        inviteePhone: inviteOwnerPhone.trim(),
        billing_status: inviteBilling,
      };
      const td = Math.floor(Number(inviteTrialDays));
      if (inviteBilling === "trial" && Number.isFinite(td) && td > 0) payload.trial_days = td;
      const pd = Math.floor(Number(invitePaidDays));
      if (inviteBilling === "active" && Number.isFinite(pd) && pd > 0) payload.paid_access_days = pd;

      const res = await fetch("/api/platform-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(userFacingApiError(data.error, "Invite failed"));
        return;
      }
      if (!data.emailSent) {
        toast.error(
          "We couldn’t send the invitation email automatically. Confirm mail settings with your host, or share the invite link manually."
        );
        if (data.inviteLink) {
          void navigator.clipboard.writeText(data.inviteLink);
          toast.message("Invite link copied — you can share it manually.");
        }
      } else {
        toast.success("Invitation sent (ask the recipient to check their inbox)");
      }
      setInviteEmail("");
      setInviteTenantName("");
      setInviteOwnerName("");
      setInviteOwnerPhone("");
      setInviteBilling("trial");
      setInviteTrialDays("");
      setInvitePaidDays("");
      await load();
    } catch {
      toast.error("Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function patchTenant(tenantId: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/platform-admin/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(userFacingApiError(data.error, "Update failed"));
      throw new Error("patch failed");
    }
    await load({ silent: true });
  }

  async function setBilling(tenantId: string, billing_status: string) {
    try {
      await patchTenant(tenantId, { billing_status });
      toast.success("Billing status updated");
    } catch {
      /* toast in patchTenant */
    }
  }

  async function togglePauseTenant(tenantId: string, paused: boolean) {
    try {
      await patchTenant(tenantId, { access_paused: paused });
      toast.success(paused ? "Workspace paused" : "Workspace resumed");
    } catch {
      /* toast in patchTenant */
    }
  }

  async function grantPaidAccess(tenantId: string) {
    const raw = grantDaysByTenant[tenantId] ?? "";
    const days = Math.floor(Number(raw));
    if (!(days > 0)) {
      toast.error("Enter how many days to grant");
      return;
    }
    try {
      await patchTenant(tenantId, { grant_paid_access_days: days });
      toast.success(`Added ${days} days of paid access`);
      setGrantDaysByTenant((m) => ({ ...m, [tenantId]: "" }));
    } catch {
      /* toast in patchTenant */
    }
  }

  async function removeMember(tenantId: string, userId: string) {
    if (!confirm("Remove this user from the workspace?")) return;
    try {
      const res = await fetch("/api/platform-admin/members/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, userId }),
      });
      if (!res.ok) throw new Error();
      toast.success("User removed");
      await load();
    } catch {
      toast.error("Could not remove user");
    }
  }

  async function revokeInvitation(invitationId: string) {
    if (!confirm("Revoke this invitation? The link will stop working.")) return;
    try {
      const res = await fetch(`/api/platform-admin/invitations/${invitationId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(userFacingApiError(data.error, "Could not revoke invitation"));
        return;
      }
      toast.success("Invitation revoked");
      await load();
    } catch {
      toast.error("Could not revoke invitation");
    }
  }

  async function deleteWorkspace(tenantId: string, tenantName: string) {
    if (
      !confirm(
        `Delete workspace “${tenantName}”, its data, and related sign-in access for invited users? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/platform-admin/tenants/${tenantId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(userFacingApiError(data.error, "Could not delete workspace"));
        return;
      }
      toast.success("Workspace deleted");
      await load();
    } catch {
      toast.error("Could not delete workspace");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[min(100vw-1rem,1400px)] space-y-8 px-2 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Platform admin</h1>
        <p className="text-muted-foreground">
          Invite operators to their own workspace and record billing status manually for now.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite new workspace</CardTitle>
          <CardDescription>
            Billing is manual: set trial or active when inviting, optionally limit how long trial or paid access lasts.
            After that date users cannot sign in until you extend paid days or change billing. Use Pause to block a
            workspace immediately. The contact name and phone you enter are for your records only — when they accept,
            they choose their own profile name and phone (shown under Members and on accepted invites). Configure your
            email sign-in provider to allow your site URLs and invitation completion redirects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvite} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Workspace / company name</Label>
                <Input
                  id="tenantName"
                  required
                  value={inviteTenantName}
                  onChange={(e) => setInviteTenantName(e.target.value)}
                  placeholder="City Cycle Hire"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Invite email</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="owner@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteOwnerName">Contact name (reference)</Label>
                <Input
                  id="inviteOwnerName"
                  required
                  minLength={2}
                  value={inviteOwnerName}
                  onChange={(e) => setInviteOwnerName(e.target.value)}
                  placeholder="Who you’re inviting — not required to match their signup"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteOwnerPhone">Contact phone (reference)</Label>
                <Input
                  id="inviteOwnerPhone"
                  type="tel"
                  required
                  value={inviteOwnerPhone}
                  onChange={(e) => setInviteOwnerPhone(e.target.value)}
                  placeholder="Their number on file — they enter their own at signup"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Plan at invite</Label>
                  <Select value={inviteBilling} onValueChange={(v) => v && setInviteBilling(v as "trial" | "active")}>
                    <SelectTrigger id="inviteBilling">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial (default {DEFAULT_TRIAL_DAYS} days)</SelectItem>
                      <SelectItem value="active">Active (paid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="invitePeriodDays">
                    {inviteBilling === "trial" ? "Trial length (days)" : "Paid access (days)"}
                  </Label>
                  <Input
                    id="invitePeriodDays"
                    type="number"
                    min={1}
                    placeholder={
                      inviteBilling === "trial" ? String(DEFAULT_TRIAL_DAYS) : "Optional — unlimited if empty"
                    }
                    value={inviteBilling === "trial" ? inviteTrialDays : invitePaidDays}
                    onChange={(e) =>
                      inviteBilling === "trial"
                        ? setInviteTrialDays(e.target.value)
                        : setInvitePaidDays(e.target.value)
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {inviteBilling === "trial"
                      ? `Leave blank to use server default (${DEFAULT_TRIAL_DAYS} days).`
                      : "Leave blank for paid access with no fixed end date."}
                  </p>
                </div>
              </div>
              <Button type="submit" disabled={inviting} className="w-full shrink-0 sm:w-auto lg:w-fit">
                {inviting ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>
            Change billing, pause access, or add paid days from today (or from the current paid-through date if still in
            the future). Users see a clear message at login when trial or paid time has ended.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0 overflow-hidden">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : tenants.length === 0 ? (
            <p className="text-muted-foreground">No workspaces yet.</p>
          ) : (
            <Table className="table-fixed text-sm">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[26%] min-w-0">Workspace</TableHead>
                  <TableHead className="w-[14%] min-w-0">Billing</TableHead>
                  <TableHead className="w-[14%] min-w-0">Until</TableHead>
                  <TableHead className="w-[14%] min-w-0">Invites</TableHead>
                  <TableHead className="w-[14%] min-w-0">Members</TableHead>
                  <TableHead className="w-[18%] min-w-0 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id} className="align-middle">
                    <TableCell className="min-w-0 py-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">{t.name}</span>
                          {t.access_paused ? (
                            <Badge variant="destructive" className="shrink-0 text-[10px] uppercase">
                              Paused
                            </Badge>
                          ) : null}
                        </div>
                        <div className="truncate font-mono text-[10px] text-muted-foreground" title={t.id}>
                          {t.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-0 py-3">
                      <Select value={t.billing_status} onValueChange={(v) => v && setBilling(t.id, v)}>
                        <SelectTrigger className="h-8 w-full min-w-0 max-w-full truncate text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">trial</SelectItem>
                          <SelectItem value="active">active (paid)</SelectItem>
                          <SelectItem value="past_due">past_due</SelectItem>
                          <SelectItem value="canceled">canceled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-0 whitespace-nowrap py-3 text-xs text-muted-foreground">
                      {t.billing_status === "trial" && t.trial_ends_at
                        ? format(new Date(t.trial_ends_at), "PP")
                        : t.billing_status === "active"
                          ? t.paid_access_ends_at
                            ? format(new Date(t.paid_access_ends_at), "PP")
                            : "No end"
                          : "—"}
                    </TableCell>
                    <TableCell className="min-w-0 py-3">
                      <InvitesMenu
                        invitations={t.invitations ?? []}
                        members={t.members ?? []}
                        onRevoke={revokeInvitation}
                      />
                    </TableCell>
                    <TableCell className="min-w-0 py-3">
                      <MembersMenu members={t.members ?? []} tenantId={t.id} onRemove={removeMember} />
                    </TableCell>
                    <TableCell className="min-w-0 py-3">
                      <div className="flex flex-nowrap items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant={t.access_paused ? "default" : "outline"}
                          size="sm"
                          className="h-8 shrink-0 px-2 text-xs"
                          onClick={() => togglePauseTenant(t.id, !t.access_paused)}
                        >
                          {t.access_paused ? "Resume" : "Pause"}
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-11 shrink-0 px-1 text-center text-xs"
                          placeholder=""
                          title="Grant paid days"
                          value={grantDaysByTenant[t.id] ?? ""}
                          onChange={(e) =>
                            setGrantDaysByTenant((m) => ({ ...m, [t.id]: e.target.value }))
                          }
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-8 shrink-0 px-2 text-xs"
                          onClick={() => grantPaidAccess(t.id)}
                        >
                          Grant
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label="More actions"
                            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 shrink-0")}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => deleteWorkspace(t.id, t.name)}
                            >
                              Delete workspace
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
