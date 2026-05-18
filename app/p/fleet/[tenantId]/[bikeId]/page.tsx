import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import * as db from "@/lib/db";
import * as platformDb from "@/lib/db-platform";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EbikeSpecsPanel } from "@/components/bikes/EbikeSpecsPanel";
import { PublicBikeRentSection } from "@/components/public/PublicBikeRentSection";
import {
  listBikeMediaGallery,
  PUBLIC_FLEET_GALLERY_SIGNED_URL_TTL_SECONDS,
} from "@/lib/bike-media-urls";
import { formatCurrency } from "@/lib/calculations";
import { primaryWeeklyRateFromPackages } from "@/lib/rent-packages";
import { ArrowLeft } from "lucide-react";
import { BackNavButton } from "@/components/navigation/BackNavButton";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantId: string; bikeId: string }>;
}) {
  const { tenantId, bikeId } = await params;
  const tenant = await platformDb.getTenantById(tenantId);
  const bike = await db.getBikeById(tenantId, bikeId);
  if (!tenant || !bike || bike.status !== "available") {
    return { title: "Bike" };
  }
  return {
    title: `${bike.name} · ${tenant.name}`,
    description: `Available bike from ${tenant.name}: ${bike.brand} ${bike.model}`.trim(),
  };
}

export default async function PublicFleetBikeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string; bikeId: string }>;
  searchParams: Promise<{ pkg?: string }>;
}) {
  const { tenantId, bikeId } = await params;
  const sp = await searchParams;
  const tenant = await platformDb.getTenantById(tenantId);
  if (!tenant) notFound();

  const bike = await db.getBikeById(tenantId, bikeId);
  if (!bike || bike.status !== "available") notFound();

  const currency = tenant.currency_symbol?.trim() || "£";
  const gallery = await listBikeMediaGallery(tenantId, bikeId, {
    signedUrlExpiresInSeconds: PUBLIC_FLEET_GALLERY_SIGNED_URL_TTL_SECONDS,
  });
  const firstImage = gallery.find((g) => g.media_kind === "image" && g.url);
  const firstVideo = gallery.find((g) => g.media_kind === "video" && g.url);
  const heroGallery = firstImage ?? firstVideo ?? null;
  const restGallery = heroGallery
    ? gallery.filter((g) => g.id !== heroGallery.id && g.url)
    : gallery.filter((g) => g.url);

  const legacyImageSrc = bike.image_filename ? `/uploads/bikes/${bike.image_filename}` : null;
  const listHref = `/p/fleet/${tenantId}`;
  const fromRateNum = Number(primaryWeeklyRateFromPackages(bike.rent_packages));

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <BackNavButton href={listHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              All bikes
            </BackNavButton>
            <h1 className="text-2xl font-bold">{bike.name}</h1>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground sm:text-left">{tenant.name}</p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
          <Card>
            <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
              {heroGallery?.url && heroGallery.media_kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- time-limited signed URL
                <img src={heroGallery.url} alt={bike.name} className="h-full w-full object-cover" />
              ) : heroGallery?.url && heroGallery.media_kind === "video" ? (
                <video
                  src={heroGallery.url}
                  className="h-full w-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : legacyImageSrc ? (
                <Image
                  src={legacyImageSrc}
                  alt={bike.name}
                  width={600}
                  height={340}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground">
                  🚲
                </div>
              )}
            </div>
            <CardContent className="space-y-5 p-5">
              {bike.notes?.trim() ? (
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">Description</h2>
                  <p className="text-base leading-relaxed text-foreground/90">{bike.notes.trim()}</p>
                </div>
              ) : null}
              <div className="space-y-2">
                <h2 className="text-base font-semibold tracking-wide text-foreground">Details</h2>
                <p className="text-base leading-relaxed text-foreground">
                  {bike.brand} {bike.model}
                  {bike.color && ` · ${bike.color}`}
                </p>
                {bike.serial_number ? (
                  <p className="text-sm font-medium text-foreground/80">S/N: {bike.serial_number}</p>
                ) : null}
                {bike.motor_power_w?.trim() ? (
                  <p className="text-base font-semibold text-foreground">
                    Motor: <span className="tabular-nums">{bike.motor_power_w.trim()}</span> W
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-foreground">Rent</h2>
                <PublicBikeRentSection bike={bike} currencySymbol={currency} defaultPackageId={sp.pkg} />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Available now</CardTitle>
              <CardDescription className="text-base leading-snug text-foreground/85">
                This bike is listed as available from {tenant.name}. Ask them how to reserve it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fromRateNum > 0 ? (
                <p className="text-base text-foreground">
                  From{" "}
                  <span className="text-xl font-bold tabular-nums">{formatCurrency(fromRateNum, currency)}</span>
                  <span className="font-semibold text-muted-foreground">/week</span>
                </p>
              ) : null}
              <Button variant="outline" className="w-full text-base" asChild>
                <Link href={listHref}>See other available bikes</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <EbikeSpecsPanel bike={bike} title="E-bike & sizing" />

        {restGallery.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>More photos & videos</CardTitle>
              <CardDescription>All uploads for this bike, in library order.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {restGallery.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-lg border bg-muted/40">
                    <div className="aspect-video bg-muted">
                      {item.media_kind === "video" ? (
                        <video
                          src={item.url!}
                          className="h-full w-full object-cover"
                          controls
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
                        <img src={item.url!} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-center text-xs text-muted-foreground">
          Media links expire after some time; refresh the page if something fails to load.
        </p>
      </div>
    </div>
  );
}
