import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/lib/env";
import {
  isGuestRoute,
  isProtectedRoute,
  routes,
  safeNextPath,
} from "@/config/routes";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(!error && data?.claims.sub);
  const pathname = request.nextUrl.pathname;

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = routes.login;
    url.searchParams.set("next", pathname);
    return withSupabaseCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (isAuthenticated && isGuestRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = safeNextPath(request.nextUrl.searchParams.get("next"));
    url.search = "";
    return withSupabaseCookies(supabaseResponse, NextResponse.redirect(url));
  }

  return supabaseResponse;
}

function withSupabaseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) {
      to.headers.set(header, value);
    }
  }

  return to;
}
