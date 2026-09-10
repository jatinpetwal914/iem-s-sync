import type { createServerSupabaseClient } from "@/lib/supabase/server";

type ProfileClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function ensureProfile(
  supabase: ProfileClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    return { ok: false, message: "Could not load your profile. Please try again." };
  }

  if (data) {
    return { ok: true };
  }

  const { error: insertError } = await supabase.from("profiles").insert({ id: userId });

  if (insertError && insertError.code !== "23505") {
    return { ok: false, message: "Could not create your profile. Please try again." };
  }

  return { ok: true };
}
