"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import JSZip from "jszip";
import { useTenantPreferences } from "@/components/tenant/TenantPreferencesProvider";
import {
  TENANT_CURRENCY_OPTIONS,
  normalizeTenantCurrencySymbol,
  type TenantCurrencySymbol,
} from "@/lib/tenant-currency";

export default function SettingsPage() {
  const prefs = useTenantPreferences();
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [currency, setCurrency] = useState<TenantCurrencySymbol>("£");
  const [defaultWeeklyRate, setDefaultWeeklyRate] = useState("80");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    if (prefs.loading) return;
    setBusinessName(prefs.businessName);
    setOwnerName(prefs.ownerName);
    setCurrency(normalizeTenantCurrencySymbol(prefs.currencySymbol));
    setDefaultWeeklyRate(String(prefs.defaultWeeklyRate));
    setNotificationEmail(prefs.notificationEmail);
  }, [
    prefs.loading,
    prefs.businessName,
    prefs.ownerName,
    prefs.currencySymbol,
    prefs.defaultWeeklyRate,
    prefs.notificationEmail,
  ]);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const weekly = Number(defaultWeeklyRate);
      if (!Number.isFinite(weekly) || weekly < 0) {
        toast.error("Default weekly rate must be zero or positive");
        setSaving(false);
        return;
      }
      const res = await fetch("/api/tenant/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          ownerName,
          currencySymbol: currency,
          defaultWeeklyRate: weekly,
          notificationEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not save settings");
        return;
      }
      await prefs.refresh();
      toast.success("Settings saved");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    setBackingUp(true);
    try {
      const [bikes, rentals, repairs, expenses, notifications] = await Promise.all([
        fetch("/api/bikes").then((r) => r.json()),
        fetch("/api/rentals").then((r) => r.json()),
        fetch("/api/repairs").then((r) => r.json()),
        fetch("/api/expenses").then((r) => r.json()),
        fetch("/api/notifications").then((r) => r.json()),
      ]);
      const zip = new JSZip();
      zip.file("bikes.csv", toCSV(bikes));
      zip.file("rentals.csv", toCSV(rentals));
      zip.file("repairs.csv", toCSV(repairs));
      zip.file("expenses.csv", toCSV(expenses));
      zip.file("notifications.csv", toCSV(notifications));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bikeinsights-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch {
      toast.error("Backup failed");
    } finally {
      setBackingUp(false);
    }
  }

  function toCSV(arr: Record<string, unknown>[]): string {
    if (arr.length === 0) return "";
    const headers = Object.keys(arr[0]);
    const rows = arr.map((row) =>
      headers.map((h) => JSON.stringify((row as Record<string, unknown>)[h] ?? "")).join(",")
    );
    return [headers.join(","), ...rows].join("\n");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>
            Business name is stored on your workspace. Currency and default weekly rate apply across your dashboard for
            everyone in this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={prefs.loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Contact or owner display name"
                disabled={prefs.loading}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => v && setCurrency(v as TenantCurrencySymbol)}
                disabled={prefs.loading}
              >
                <SelectTrigger id="currency" className="w-[200px]">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {TENANT_CURRENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultWeeklyRate">Default weekly rate</Label>
              <Input
                id="defaultWeeklyRate"
                type="number"
                min={0}
                step="0.01"
                value={defaultWeeklyRate}
                onChange={(e) => setDefaultWeeklyRate(e.target.value)}
                className="w-32"
                disabled={prefs.loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Email for reminders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notificationEmail">Notification email</Label>
            <Input
              id="notificationEmail"
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={prefs.loading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Configure RESEND_API_KEY and NOTIFICATION_FROM_EMAIL in .env.local for email reminders.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => void handleSaveSettings()} disabled={saving || prefs.loading}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Backup or restore your CSV data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={() => void handleBackup()} disabled={backingUp}>
            {backingUp ? "Preparing…" : "Download backup (ZIP)"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Backup downloads all CSV files as a ZIP. To restore, replace files in /data/ and restart.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
