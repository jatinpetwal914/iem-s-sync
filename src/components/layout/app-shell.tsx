import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { StudioShell } from "@/components/studio/studio-shell";
import { getAuthSession } from "@/features/auth/get-current-user";
import { listMyWorkspaces } from "@/features/teams/queries";
import { canControlTeamSession } from "@/types/permissions";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/8 px-5 py-6 sm:px-8">
      <p className="font-mono text-[10px] tracking-[0.18em] text-muted">
        IEM SYNC · TIMING OVER THE NETWORK · AUDIO ON THE DEVICE
      </p>
    </footer>
  );
}

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await getAuthSession();

  if (session.status !== "authenticated") {
    return (
      <div className="site-atmosphere flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </div>
    );
  }

  const teams = await listMyWorkspaces(session.user.id);
  const workspace = teams.ok ? (teams.workspaces[0] ?? null) : null;
  const canControl =
    teams.ok &&
    teams.workspaces.some((item) =>
      canControlTeamSession(item.role, item.membershipStatus),
    );

  return (
    <StudioShell teamId={workspace?.teamId ?? null} canControl={canControl}>
      {children}
    </StudioShell>
  );
}
