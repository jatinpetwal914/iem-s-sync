import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InviteStatus } from "@/types/session";
import type { ActiveInvite } from "@/features/invites/types";

export async function listActiveInvites(
  teamId: string,
): Promise<{ ok: true; invites: ActiveInvite[] } | { ok: false; message: string }> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("team_invites")
    .select(
      "id, team_id, created_by, created_at, expires_at, max_uses, use_count, status",
    )
    .eq("team_id", teamId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, message: "Could not load invitations." };
  }

  const invites: ActiveInvite[] = [];

  for (const row of data ?? []) {
    if (row.use_count >= row.max_uses) {
      continue;
    }

    invites.push({
      id: row.id,
      teamId: row.team_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      maxUses: row.max_uses,
      useCount: row.use_count,
      status: row.status as InviteStatus,
    });
  }

  return { ok: true, invites };
}
