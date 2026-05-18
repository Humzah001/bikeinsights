"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BikeStatusBadge } from "./BikeStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { BikeListGallerySlide } from "@/lib/bike-media-urls";
import type { Bike } from "@/lib/types";
import { BikeWeeklyRentLines } from "@/components/bikes/EbikeSpecsPanel";
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BikeCardProps {
  bike: Bike;
  currentRenter?: string | null;
  currencySymbol?: string;
  /** Gallery slides (images + videos) with signed URLs from the list API. */
  gallerySlides?: BikeListGallerySlide[];
  /** When there is no gallery, first image URL from API (usually null if using gallery only). */
  coverImageUrl?: string | null;
}

export function BikeCard({
  bike,
  currentRenter,
  currencySymbol = "£",
  gallerySlides = [],
  coverImageUrl = null,
}: BikeCardProps) {
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

  return (
    <Card>
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
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
                  onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
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
                  onClick={() => setIndex((i) => (i + 1) % slides.length)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="absolute right-1 bottom-1 z-10 rounded bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums shadow-sm">
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
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">{bike.name}</h3>
            <p className="text-sm text-muted-foreground">
              {bike.brand} {bike.model}
              {bike.color && ` · ${bike.color}`}
            </p>
            {bike.serial_number && (
              <p className="mt-1 text-xs text-muted-foreground">
                S/N: {bike.serial_number}
              </p>
            )}
          </div>
          <BikeStatusBadge status={bike.status} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            <BikeWeeklyRentLines bike={bike} currencySymbol={currencySymbol} />
            {currentRenter && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Rented by {currentRenter}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/bikes/${bike.id}`} aria-label="View">
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/bikes/${bike.id}/edit`} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/bikes/${bike.id}/delete`} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
