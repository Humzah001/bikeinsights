import Image from "next/image";
import Link from "next/link";
import { BikeStatusBadge } from "./BikeStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Bike } from "@/lib/types";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface BikeCardProps {
  bike: Bike;
  currentRenter?: string | null;
}

export function BikeCard({ bike, currentRenter }: BikeCardProps) {
  const imageSrc = bike.image_filename
    ? `/uploads/bikes/${bike.image_filename}`
    : null;

  return (
    <Card>
      <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
        {imageSrc ? (
          <Image
            src={imageSrc}
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
            <span className="text-lg font-semibold">£{bike.weekly_rate}</span>
            <span className="text-sm text-muted-foreground">/week</span>
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
