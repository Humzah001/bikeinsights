"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { uploadBikeMediaFiles, capToSingleVideoTotal } from "@/lib/upload-bike-media-client";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

type GalleryItem = {
  id: string;
  media_kind: "image" | "video";
  url: string | null;
  content_type: string;
};

export function BikeMediaPanel({ bikeId }: { bikeId: string }) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/bikes/${bikeId}/media`);
      const j = (await r.json().catch(() => ({}))) as { items?: GalleryItem[] };
      if (r.ok && Array.isArray(j.items)) setItems(j.items);
      else if (!r.ok) setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [bikeId]);

  async function onDelete(mediaId: string) {
    const r = await fetch(`/api/bikes/${bikeId}/media/${mediaId}`, { method: "DELETE" });
    if (r.ok) {
      toast.success("Media removed");
      void load();
    } else {
      toast.error("Could not remove file");
    }
  }

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    const capped = capToSingleVideoTotal(Array.from(files));
    if (capped.droppedExtraVideos > 0) {
      toast.warning("Only one video per bike. Extra video files were skipped.");
    }
    const list = capped.files;
    setUploading(true);
    try {
      const up = await uploadBikeMediaFiles(bikeId, list);
      if (up.ok) {
        toast.success(up.uploaded > 1 ? `Uploaded ${up.uploaded} files` : "Upload complete");
        void load();
        if (inputRef.current) inputRef.current.value = "";
      } else {
        if (up.uploaded > 0) {
          toast.warning(`Uploaded ${up.uploaded} of ${list.length}. ${up.error}`);
          void load();
        } else {
          toast.error(up.error);
        }
        if (inputRef.current) inputRef.current.value = "";
      }
    } finally {
      setUploading(false);
    }
  }

  const visible = items.filter((i) => i.url);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos & videos</CardTitle>
        <CardDescription>
          Multiple photos allowed; only one video per bike (remove the existing video to replace it). Select multiple
          images at once, or add another batch after an upload. JPEG, PNG, WebP, MP4, WebM, or QuickTime — stored in
          Supabase Storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            multiple
            className="hidden"
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading…" : "Add files (multi-select OK)"}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading media…</p>
        ) : items.length > 0 && visible.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Media records exist but signed URLs could not be generated. Check Supabase env (URL + service role) on the server.
          </p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No uploads yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visible.map((item) => (
              <li key={item.id} className="group relative overflow-hidden rounded-lg border bg-muted/40">
                <div className="aspect-video w-full bg-muted">
                  {item.media_kind === "video" ? (
                    // eslint-disable-next-line jsx-a11y/media-has-caption -- decorative / user content
                    <video src={item.url!} className="h-full w-full object-cover" controls playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL
                    <img src={item.url!} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 opacity-90 shadow-md"
                  aria-label="Remove media"
                  onClick={() => void onDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
