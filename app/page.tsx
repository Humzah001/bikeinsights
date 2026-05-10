import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { SupabaseRootRedirect } from "./SupabaseRootRedirect";

export const metadata: Metadata = {
  title: "My Bike Insights | Bike rental fleet management",
  description:
    "Track bikes, weekly rent, repairs, and expenses in one place. Dashboards, pending payments, and collections built for rental shops.",
  openGraph: {
    title: "My Bike Insights",
    description: "Run bike rentals with numbers you can trust.",
  },
};

export default function HomePage() {
  return (
    <>
      <SupabaseRootRedirect />
      <LandingPage />
    </>
  );
}
