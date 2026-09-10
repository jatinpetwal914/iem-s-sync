import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authGateFromClaims } from "@/features/auth/auth-gate";
import type { AuthGateState } from "@/types/session";

export async function getAuthGateState(): Promise<AuthGateState> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();

  return authGateFromClaims(data?.claims);
}
