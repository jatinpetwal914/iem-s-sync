import { createServerSupabaseClient } from "@/lib/supabase/server";
import { authErrorMessage, isNetworkFailure } from "@/features/auth/auth-errors";
import { ensureProfile } from "@/features/auth/ensure-profile";

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type AuthSessionResult =
  | { status: "authenticated"; user: CurrentUser }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export async function getAuthSession(): Promise<AuthSessionResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error) {
      if (isNetworkFailure(error)) {
        return { status: "error", message: authErrorMessage(error) };
      }

      return { status: "unauthenticated" };
    }

    const userId = data?.claims.sub;
    if (!userId) {
      return { status: "unauthenticated" };
    }

    const profileResult = await ensureProfile(supabase, userId);
    if (!profileResult.ok) {
      return { status: "error", message: profileResult.message };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return {
        status: "error",
        message: "Could not load your profile. Please try again.",
      };
    }

    return {
      status: "authenticated",
      user: {
        id: userId,
        email: data.claims.email ?? null,
        displayName: profile?.display_name ?? null,
      },
    };
  } catch (error) {
    return { status: "error", message: authErrorMessage(error) };
  }
}
