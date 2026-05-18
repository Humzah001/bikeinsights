import { notFound } from "next/navigation";
import * as db from "@/lib/db";
import * as platformDb from "@/lib/db-platform";
import { attachBikeListGallery, PUBLIC_FLEET_GALLERY_SIGNED_URL_TTL_SECONDS } from "@/lib/bike-media-urls";
import { PublicFleetBikeCard } from "@/components/public/PublicFleetBikeCard";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await platformDb.getTenantById(tenantId);
  if (!tenant) return { title: "Available bikes" };
  return {
    title: `${tenant.name} · Available bikes`,
    description: `Bikes currently available from ${tenant.name}.`,
  };
}

export default async function PublicFleetPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await platformDb.getTenantById(tenantId);
  if (!tenant) notFound();

  const bikes = await db.getBikes(tenantId);
  const available = bikes.filter((b) => b.status === "available");
  const currency = tenant.currency_symbol?.trim() || "£";

  const withGallery = await attachBikeListGallery(tenantId, available, {
    signedUrlExpiresInSeconds: PUBLIC_FLEET_GALLERY_SIGNED_URL_TTL_SECONDS,
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <header className="text-center sm:text-left">
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Bikes available now — tap a card for full details and media.</p>
        </header>

        {withGallery.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No bikes are listed as available right now. Check back later.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {withGallery.map((bike) => (
              <PublicFleetBikeCard
                key={bike.id}
                tenantId={tenantId}
                bike={bike}
                gallerySlides={bike.gallerySlides}
                coverImageUrl={bike.coverImageUrl}
                currencySymbol={currency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
