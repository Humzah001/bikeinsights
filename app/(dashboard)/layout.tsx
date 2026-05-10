import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getSession } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const showPlatformAdmin = Boolean(session.isLoggedIn && session.isPlatformAdmin);

  return (
    <DashboardShell showPlatformAdmin={showPlatformAdmin}>
      {children}
    </DashboardShell>
  );
}
