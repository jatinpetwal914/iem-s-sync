import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  // Cookie-backed session from @supabase/ssr. Do not persist tokens in localStorage.
  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
