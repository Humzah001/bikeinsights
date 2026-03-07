"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import { BikeStatusBadge } from "@/components/bikes/BikeStatusBadge";
import type { Bike } from "@/lib/types";
import { MapPin, Mail, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";

const Map = dynamic(() => import("@/components/tracker/BikeMap"), { ssr: false });

export default function TrackerPage() {
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedBikeId, setSelectedBikeId] = useState<string>("");
  const [shareUrl, setShareUrl] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  function loadBikes() {
    return fetch("/api/bikes")
      .then((r) => r.json())
      .then(setBikes)
      .catch(() => {});
  }

  useEffect(() => {
    loadBikes().finally(() => setLoading(false));
  }, []);

  const bikesWithLocation = bikes.filter(
    (b) =>
      (b.last_latitude && b.last_longitude) ||
      b.tracker_share_url
  );
  const bikesWithCoords = bikes.filter(
    (b) => b.last_latitude && b.last_longitude
  );

  async function handleEmailLocations() {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/tracker/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Email sent with all AirTag links");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleAddAirTag(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBikeId) {
      toast.error("Select a bike");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/bikes/${selectedBikeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracker_share_url: shareUrl || undefined,
          last_latitude: lat || undefined,
          last_longitude: lng || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success("AirTag / location updated");
      setShareUrl("");
      setLat("");
      setLng("");
      loadBikes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  function fillFormForBike(bike: Bike) {
    setSelectedBikeId(bike.id);
    setShareUrl(bike.tracker_share_url || "");
    setLat(bike.last_latitude || "");
    setLng(bike.last_longitude || "");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Tracker</h1>
        <div className="h-[400px] animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Tracker</h1>
        <Button
          variant="outline"
          onClick={handleEmailLocations}
          disabled={sendingEmail || bikesWithLocation.length === 0}
        >
          <Mail className="mr-2 h-4 w-4" />
          {sendingEmail ? "Sending…" : "Email all locations"}
        </Button>
      </div>

      {/* Add / Update AirTag */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add or update AirTag
          </CardTitle>
          <CardDescription>
            Paste the Find My share link for a bike&apos;s AirTag. Optionally add last known latitude/longitude so the bike appears on the map (e.g. from Find My app).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAirTag} className="space-y-4">
            <div className="space-y-2">
              <Label>Bike</Label>
              <Select value={selectedBikeId} onValueChange={(v) => setSelectedBikeId(v ?? "")}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select bike" />
                </SelectTrigger>
                <SelectContent>
                  {bikes.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share_url">Find My / AirTag share URL</Label>
              <Input
                id="share_url"
                type="url"
                placeholder="https://www.icloud.com/find/my/..."
                value={shareUrl}
                onChange={(e) => setShareUrl(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lat">Last known latitude (optional)</Label>
                <Input
                  id="lat"
                  type="text"
                  placeholder="e.g. 51.5074"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Last known longitude (optional)</Label>
                <Input
                  id="lng"
                  type="text"
                  placeholder="e.g. -0.1278"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save AirTag / location"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All bikes on map</CardTitle>
              <CardContent className="p-0 pt-2">
                <p className="text-sm text-muted-foreground">
                  {bikesWithCoords.length} bike{bikesWithCoords.length !== 1 ? "s" : ""} with coordinates. Add location above or on bike edit to show here.
                </p>
              </CardContent>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] w-full overflow-hidden rounded-lg bg-muted">
                <Map bikes={bikesWithCoords} />
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Bikes</CardTitle>
              <CardContent className="p-0 pt-2">
                <p className="text-sm text-muted-foreground">
                  Open AirTag share link for live location in Find My / Maps.
                </p>
              </CardContent>
            </CardHeader>
            <CardContent className="space-y-2">
              {bikes.map((bike) => (
                <div
                  key={bike.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{bike.name}</p>
                    <BikeStatusBadge status={bike.status} />
                    {(bike.last_latitude && bike.last_longitude) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        On map: {bike.last_latitude}, {bike.last_longitude}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fillFormForBike(bike)}
                      title="Edit in form above"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    {bike.tracker_share_url && (
                      <Button size="sm" asChild>
                        <a
                          href={bike.tracker_share_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/bikes/${bike.id}/edit`}>
                        <MapPin className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
