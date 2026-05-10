import { getSupabase } from "@/lib/supabase/server";

/** Deletes Supabase Auth user by email if present. Logs and continues on errors (best-effort). */
export async function deleteAuthUserByEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;

  try {
    const sb = getSupabase();
    const perPage = 200;
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[deleteAuthUserByEmail] listUsers:", error.message);
        return;
      }
      const u = data.users.find((x) => (x.email ?? "").trim().toLowerCase() === normalized);
      if (u) {
        const { error: delErr } = await sb.auth.admin.deleteUser(u.id);
        if (delErr) {
          console.error("[deleteAuthUserByEmail] deleteUser:", delErr.message);
        }
        return;
      }
      if (data.users.length < perPage) break;
    }
  } catch (e) {
    console.error("[deleteAuthUserByEmail]", e);
  }
}
