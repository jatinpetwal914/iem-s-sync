import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { routes, safeNextPath } from "@/config/routes";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const redirectBase =
    isLocalEnv || !forwardedHost ? origin : `https://${forwardedHost}`;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${redirectBase}${next}`);
    }
  }

  const login = new URL(routes.login, redirectBase);
  login.searchParams.set(
    "error",
    code ? "confirmation" : "session",
  );

  return NextResponse.redirect(login);
}
