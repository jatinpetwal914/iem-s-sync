"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseAuthForm } from "@/features/auth/auth-form";
import {
  authErrorMessage,
  isDuplicateSignupUser,
} from "@/features/auth/auth-errors";
import { ensureProfile } from "@/features/auth/ensure-profile";
import { getRequestOrigin } from "@/features/auth/request-origin";
import { routes, safeNextPath } from "@/config/routes";
import type { AuthActionState } from "@/features/auth/auth-action-state";

function invalidState(issues: string[]): AuthActionState {
  return {
    status: "error",
    issues,
    message: null,
  };
}

function errorState(message: string): AuthActionState {
  return {
    status: "error",
    issues: [],
    message,
  };
}

export async function signIn(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseAuthForm({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.ok) {
    return invalidState(parsed.issues);
  }

  const nextPath = safeNextPath(String(formData.get("next") ?? ""));

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.value.email,
      password: parsed.value.password,
    });

    if (error) {
      return errorState(authErrorMessage(error));
    }

    if (!data.user) {
      return errorState("Could not start a session. Please try again.");
    }

    const profileResult = await ensureProfile(supabase, data.user.id);
    if (!profileResult.ok) {
      return errorState(profileResult.message);
    }
  } catch (error) {
    return errorState(authErrorMessage(error));
  }

  redirect(nextPath);
}

export async function signUp(
  _previous: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = parseAuthForm({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.ok) {
    return invalidState(parsed.issues);
  }

  const nextPath = safeNextPath(String(formData.get("next") ?? ""));

  try {
    const origin = await getRequestOrigin();
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.value.email,
      password: parsed.value.password,
      options: {
        emailRedirectTo: `${origin}${routes.authCallback}?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      return errorState(authErrorMessage(error));
    }

    if (isDuplicateSignupUser(data.user)) {
      return errorState(
        "An account with this email already exists. Try logging in.",
      );
    }

    if (!data.user) {
      return errorState("Could not create your account. Please try again.");
    }

    if (!data.session) {
      return {
        status: "needs_confirmation",
        issues: [],
        message:
          "Account created. Confirm your email, then sign in to continue.",
      };
    }

    const profileResult = await ensureProfile(supabase, data.user.id);
    if (!profileResult.ok) {
      return errorState(profileResult.message);
    }
  } catch (error) {
    return errorState(authErrorMessage(error));
  }

  redirect(nextPath);
}

export async function signOut() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Always clear the local route even if the Auth API is unreachable.
  }

  redirect(routes.login);
}
