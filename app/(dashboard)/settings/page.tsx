"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import JSZip from "jszip";

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("BikeInsights");
  const [ownerName, setOwnerName] = useState("");
  const [currency, setCurrency] = useState("£");
  const [defaultWeeklyRate, setDefaultWeeklyRate] = useState("80");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

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
          <CardDescription>Business name, owner, and currency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner name</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency symbol</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultWeeklyRate">Default weekly rate</Label>
              <Input
                id="defaultWeeklyRate"
                type="number"
                value={defaultWeeklyRate}
                onChange={(e) => setDefaultWeeklyRate(e.target.value)}
                className="w-28"
              />
            </div>
          </div>
          <Button disabled={saving}>Save (stored in browser for now)</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Email for reminders and tracker links.</CardDescription>
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
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Configure RESEND_API_KEY and NOTIFICATION_FROM_EMAIL in .env.local for email reminders.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Backup or restore your CSV data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={handleBackup} disabled={backingUp}>
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
