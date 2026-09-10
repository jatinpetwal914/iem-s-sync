"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useMemo } from "react";

export function useSupabaseBrowserClient() {
  return useMemo(() => createBrowserSupabaseClient(), []);
}
