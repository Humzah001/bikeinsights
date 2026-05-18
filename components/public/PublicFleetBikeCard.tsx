"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BikeListGallerySlide } from "@/lib/bike-media-urls";
import type { Bike } from "@/lib/types";
import { getBikeRentTiers } from "@/components/bikes/EbikeSpecsPanel";
import { formatCurrency } from "@/lib/calculations";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PublicFleetBikeCard({
  tenantId,
  bike,
  currencySymbol = "£",
  gallerySlides = [],
  coverImageUrl = null,
}: {
  tenantId: string;
  bike: Bike;
  currencySymbol?: string;
  gallerySlides?: BikeListGallerySlide[];
  coverImageUrl?: string | null;
}) {
  const detailHref = `/p/fleet/${tenantId}/${bike.id}`;
  const legacySrc = bike.image_filename ? `/uploads/bikes/${bike.image_filename}` : null;
  const slides = gallerySlides.filter((s) => s.url);
  const [index, setIndex] = useState(0);

  const slidesKey = slides.map((s) => s.url).join("|");
  useEffect(() => {
    setIndex(0);
  }, [bike.id, slidesKey]);

  useEffect(() => {
    if (slides.length > 0 && index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  const showCarousel = slides.length > 0;
  const canStep = slides.length > 1;
  const slide = showCarousel ? slides[Math.min(index, slides.length - 1)] : null;

  const tiers = getBikeRentTiers(bike);
  const motorLine = bike.motor_power_w?.trim();

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {showCarousel && slide ? (
          <>
            {slide.media_kind === "video" ? (
              <video
                src={slide.url}
                className="h-full w-full object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL
              <img src={slide.url} alt={bike.name} className="h-full w-full object-cover" />
            )}
            {canStep ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "absolute left-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full border bg-background/90 shadow-sm"
                  )}
                  aria-label="Previous media"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex((i) => (i - 1 + slides.length) % slides.length);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className={cn(
                    "absolute right-1 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full border bg-background/90 shadow-sm"
                  )}
                  aria-label="Next media"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex((i) => (i + 1) % slides.length);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="absolute bottom-1 right-1 z-10 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums shadow-sm">
                  {index + 1} / {slides.length}
                </span>
              </>
            ) : null}
          </>
        ) : coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL
          <img src={coverImageUrl} alt={bike.name} className="h-full w-full object-cover" />
        ) : legacySrc ? (
          <Image
            src={legacySrc}
            alt={bike.name}
            width={400}
            height={225}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-4xl">🚲</span>
          </div>
        )}
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1 space-y-2">
          {bike.notes?.trim() ? (
            <p className="line-clamp-3 text-sm leading-snug text-foreground/90">{bike.notes.trim()}</p>
          ) : null}
          <h3 className="text-lg font-bold leading-tight text-foreground">
            <Link href={detailHref} className="hover:underline">
              {bike.name}
            </Link>
          </h3>
          {[bike.brand, bike.model, bike.color].filter(Boolean).length > 0 ? (
            <p className="text-xs text-foreground/70">
              {[bike.brand, bike.model].filter(Boolean).join(" ")}
              {bike.color ? `${[bike.brand, bike.model].some(Boolean) ? " · " : ""}${bike.color}` : ""}
            </p>
          ) : null}
          {motorLine ? (
            <p className="text-sm font-medium text-foreground">
              Motor: <span className="tabular-nums">{motorLine}</span> W
            </p>
          ) : null}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Packages</p>
            {tiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No weekly rate set</p>
            ) : (
              <ul className="space-y-2" aria-label="Rent packages">
                {tiers.map((t) => (
                  <li
                    key={t.key}
                    className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-semibold text-foreground">{t.title}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(t.weekly, currencySymbol)}
                      <span className="font-normal text-muted-foreground">/week</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <Button variant="secondary" className="w-full" asChild>
          <Link href={detailHref}>View details &amp; media</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
