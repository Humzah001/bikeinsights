"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function DeleteBikePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [bike, setBike] = useState<{ name: string; hasActiveRental?: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/bikes/${id}`).then((r) => r.json()),
      fetch("/api/rentals").then((r) => r.json()),
    ])
      .then(([b, rentals]) => {
        const active = rentals.some(
          (r: { bike_id: string; status: string }) => r.bike_id === id && (r.status === "active" || r.status === "overdue")
        );
        setBike({ name: b.name, hasActiveRental: active });
      })
      .catch(() => toast.error("Failed to load"));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/bikes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Bike deleted");
      setOpen(false);
      router.push("/bikes");
      router.refresh();
    } catch {
      toast.error("Failed to delete bike");
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) router.push(`/bikes/${id}`);
    setOpen(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete bike</DialogTitle>
          <DialogDescription>
            {bike ? (
              <>
                Are you sure you want to delete <strong>{bike.name}</strong>? This action cannot be
                undone. Rental history will be kept.
                {bike.hasActiveRental && (
                  <span className="mt-2 block text-amber-600 dark:text-amber-400">
                    This bike has an active rental. Are you sure?
                  </span>
                )}
              </>
            ) : (
              "Loading…"
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting || !bike}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
