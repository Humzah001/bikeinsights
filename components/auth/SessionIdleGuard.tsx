"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SESSION_IDLE_MS } from "@/lib/session-idle";

const TOUCH_INTERVAL_MS = 45_000;

export function SessionIdleGuard() {
  const router = useRouter();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        /* still leave */
      }
      router.replace("/login?reason=timeout");
    }, SESSION_IDLE_MS);
  }, [router]);

  useEffect(() => {
    scheduleIdle();

    const bump = () => scheduleIdle();

    const captureOpts = { capture: true } as const;
    const scrollOpts = { passive: true, capture: true } as const;
    window.addEventListener("pointerdown", bump, captureOpts);
    window.addEventListener("keydown", bump, captureOpts);
    window.addEventListener("scroll", bump, scrollOpts);

    const touch = () => {
      fetch("/api/auth/touch", { method: "POST" }).then((res) => {
        if (res.status === 401) {
          if (idleTimer.current) clearTimeout(idleTimer.current);
          router.replace("/login?reason=timeout");
        }
      });
    };
    touch();
    const touchId = window.setInterval(touch, TOUCH_INTERVAL_MS);

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      window.clearInterval(touchId);
      window.removeEventListener("pointerdown", bump, captureOpts);
      window.removeEventListener("keydown", bump, captureOpts);
      window.removeEventListener("scroll", bump, scrollOpts);
    };
  }, [scheduleIdle, router]);

  return null;
}
