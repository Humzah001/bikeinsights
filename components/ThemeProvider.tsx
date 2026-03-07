"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem storageKey="bikeinsights-theme">
      {children}
      <Toaster richColors position="top-right" />
    </NextThemesProvider>
  );
}
