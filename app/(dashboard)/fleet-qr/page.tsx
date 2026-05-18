import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BackNavButton } from "@/components/navigation/BackNavButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantAuthOrRedirect } from "@/lib/auth-server";
import * as platformDb from "@/lib/db-platform";
import { absolutePublicFleetPageUrl } from "@/lib/public-fleet-url";
import { FleetQrClient } from "./FleetQrClient";

export default async function FleetQrPage() {
  const { tenantId } = await getTenantAuthOrRedirect();
  const tenant = await platformDb.getTenantById(tenantId);
  if (!tenant) notFound();

  const h = await headers();
  const publicUrl = absolutePublicFleetPageUrl(h, tenantId);

  return (
    <div className="space-y-4">
      <BackNavButton href="/dashboard">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to dashboard
      </BackNavButton>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Available bikes QR</CardTitle>
          <CardDescription>
            Open this only for your workspace ({tenant.name}). The link and QR code show your tenant name and every bike
            currently marked Available—no login for visitors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FleetQrClient publicUrl={publicUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
