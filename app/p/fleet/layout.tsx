import { ThemeToggleCorner } from "@/components/ThemeToggle";

export default function PublicFleetLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeToggleCorner />
      {children}
    </>
  );
}
