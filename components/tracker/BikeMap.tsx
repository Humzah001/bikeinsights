"use client";

import { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { Bike } from "@/lib/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

interface BikeMapProps {
  bikes: Bike[];
}

function FitBounds({ markers }: { markers: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, markers]);
  return null;
}

export default function BikeMap({ bikes }: BikeMapProps) {
  const markers = useMemo(
    () =>
      bikes
        .filter((b) => b.last_latitude && b.last_longitude)
        .map((b) => ({
          bike: b,
          lat: Number(b.last_latitude),
          lng: Number(b.last_longitude),
        })),
    [bikes]
  );
  const defaultCenter: [number, number] =
    markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : [51.5074, -0.1278];

  if (markers.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p>No bikes with coordinates on the map yet.</p>
        <p className="text-sm">Add an AirTag share link and optional location below to see bikes here.</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={defaultCenter}
      zoom={10}
      className="h-full w-full"
      scrollWheelZoom
    >
      <FitBounds markers={markers} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map(({ bike, lat, lng }) => (
        <Marker key={bike.id} position={[lat, lng]}>
          <Popup>
            <div>
              <p className="font-semibold">{bike.name}</p>
              <p className="text-sm text-muted-foreground">{bike.status}</p>
              {bike.tracker_share_url && (
                <a
                  href={bike.tracker_share_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open AirTag in Maps →
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
