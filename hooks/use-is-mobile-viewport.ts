"use client";

import { useEffect, useState } from "react";

const MOBILE_MAX_WIDTH_QUERY = "(max-width: 639px)";

/** True when viewport matches Tailwind's default `sm` breakpoint and below (single-column layouts). */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MAX_WIDTH_QUERY);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return isMobile;
}
