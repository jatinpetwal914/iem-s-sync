"use client";

import { useEffect, useState } from "react";
import { useSupabaseBrowserClient } from "@/hooks/use-supabase-browser-client";
import type { AuthGateState } from "@/types/session";

export type AuthUserState = {
  status: "loading" | AuthGateState;
  userId: string | null;
};

export function useAuthUser(): AuthUserState {
  const supabase = useSupabaseBrowserClient();
  const [state, setState] = useState<AuthUserState>({
    status: "loading",
    userId: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function readSession() {
      const { data, error } = await supabase.auth.getClaims();
      if (cancelled) {
        return;
      }

      if (error || !data?.claims.sub) {
        setState({
          status: "unauthenticated",
          userId: null,
        });
        return;
      }

      setState({
        status: "authenticated",
        userId: data.claims.sub,
      });
    }

    void readSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void readSession();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}
