"use client";

import { useCallback, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const QR_DISPLAY_SIZE = 220;
const DOWNLOAD_PADDING = 16;

export function FleetQrClient({ publicUrl }: { publicUrl: string }) {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const downloadQrPng = useCallback(() => {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg) {
      toast.error("Could not read QR code");
      return;
    }

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    if (!source.includes("xmlns=")) {
      source = source.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const side = QR_DISPLAY_SIZE + DOWNLOAD_PADDING * 2;
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        toast.error("Could not create image");
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, side, side);
      ctx.drawImage(img, DOWNLOAD_PADDING, DOWNLOAD_PADDING, QR_DISPLAY_SIZE, QR_DISPLAY_SIZE);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            toast.error("Could not create download");
            return;
          }
          const a = document.createElement("a");
          const pngUrl = URL.createObjectURL(blob);
          a.href = pngUrl;
          a.download = "available-bikes-qr.png";
          a.click();
          URL.revokeObjectURL(pngUrl);
          toast.success("QR code downloaded");
        },
        "image/png",
        1
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error("Could not prepare QR image");
    };

    img.src = objectUrl;
  }, []);

  function copy() {
    void (async () => {
      try {
        await navigator.clipboard.writeText(publicUrl);
        toast.success("Link copied");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Could not copy");
      }
    })();
  }

  return (
    <div className="flex flex-col items-start space-y-4">
      <div
        ref={qrWrapRef}
        className="rounded-lg border bg-white p-4 shadow-sm dark:border-border"
      >
        <QRCode value={publicUrl} size={QR_DISPLAY_SIZE} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>
      <p className="text-xs text-muted-foreground">
        Scanning opens your public page in the browser. Share only if you are happy for anyone with the link to see
        available bikes and prices.
      </p>
      <div className="flex w-full max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input readOnly value={publicUrl} className="font-mono text-xs sm:min-w-0 sm:flex-1" aria-label="Public page URL" />
        <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
          <Button type="button" variant="secondary" className="flex-1 sm:flex-initial" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button type="button" variant="outline" className="flex-1 sm:flex-initial" onClick={downloadQrPng}>
            <Download className="mr-2 h-4 w-4" />
            Download QR
          </Button>
        </div>
      </div>
    </div>
  );
}
