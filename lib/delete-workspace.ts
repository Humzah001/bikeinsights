import * as platformDb from "@/lib/db-platform";
import { deleteAuthUserByEmail } from "@/lib/supabase-auth-admin";

/**
 * Removes workspace-only members from SQL + Supabase Auth, cleans pending-invite auth users,
 * then deletes the tenant row (cascades fleet data + memberships).
 */
export async function deleteWorkspaceCascade(tenantId: string): Promise<void> {
  const members = await platformDb.listMembersWithEmails(tenantId);
  const invitations = await platformDb.listInvitationsForTenant(tenantId);

  for (const m of members) {
    const mems = await platformDb.listTenantMembershipsForUser(m.user_id);
    const otherTenants = mems.filter((x) => x.tenant_id !== tenantId);
    if (otherTenants.length === 0) {
      await deleteAuthUserByEmail(m.email);
      await platformDb.deleteAppUser(m.user_id);
    }
  }

  for (const inv of invitations) {
    const email = inv.email.trim().toLowerCase();
    const user = await platformDb.getAppUserByEmail(email);
    if (!user) {
      await deleteAuthUserByEmail(email);
      continue;
    }
    const mems = await platformDb.listTenantMembershipsForUser(user.id);
    const otherTenants = mems.filter((x) => x.tenant_id !== tenantId);
    if (otherTenants.length === 0) {
      await deleteAuthUserByEmail(email);
      await platformDb.deleteAppUser(user.id);
    }
  }

  await platformDb.deleteTenant(tenantId);
}
