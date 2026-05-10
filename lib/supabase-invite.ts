import { getSupabase } from "@/lib/supabase/server";

export type InviteAuthResult =
  | { ok: true }
  | { ok: false; message: string; status?: number; code?: string };

export async function inviteAuthUserByEmail(params: {
  email: string;
  redirectTo: string;
  userMetadata?: Record<string, unknown>;
}): Promise<InviteAuthResult> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.admin.inviteUserByEmail(params.email, {
    redirectTo: params.redirectTo,
    data: params.userMetadata ?? {},
  });
  if (!error) return { ok: true };

  const status = typeof error.status === "number" ? error.status : undefined;
  const code = typeof error.code === "string" ? error.code : undefined;
  return { ok: false, message: error.message, status, code };
}
