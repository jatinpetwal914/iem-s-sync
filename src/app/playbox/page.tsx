import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { listMyWorkspaces } from "@/features/teams/queries";
import { ErrorState } from "@/components/ui/error-state";
import { Panel } from "@/components/ui/panel";
import { ButtonLink } from "@/components/ui/button";
import { canAccessPlayBox } from "@/types/permissions";
import { PlayBoxBlockedState } from "@/features/playbox/playbox-blocked-state";
import { playboxRoute, routes } from "@/config/routes";

export const metadata: Metadata = {
  title: "PlayBox",
};

export const dynamic = "force-dynamic";

export default async function PlayBoxIndexPage() {
  const session = await getAuthSession();

  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }

  if (session.status === "error") {
    return (
      <ErrorState title="Could not load PlayBox" message={session.message} />
    );
  }

  const teams = await listMyWorkspaces(session.user.id);
  if (!teams.ok) {
    return <ErrorState title="Could not load PlayBox" message={teams.message} />;
  }

  const approved = teams.workspaces.filter((workspace) =>
    canAccessPlayBox(workspace.membershipStatus),
  );

  if (approved.length === 1 && approved[0]) {
    redirect(playboxRoute(approved[0].teamId));
  }

  if (approved.length > 1) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10 sm:px-8">
        <p className="font-mono text-[11px] tracking-[0.28em] text-sync">
          PLAYBOX
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Choose a team</h1>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Open PlayBox for an approved workspace. Audio stays on this device.
        </p>
        <div className="flex flex-col gap-4">
          {approved.map((workspace) => (
            <Panel key={workspace.teamId}>
              <h2 className="text-xl font-semibold tracking-tight">
                {workspace.teamName}
              </h2>
              <div className="mt-5">
                <ButtonLink href={playboxRoute(workspace.teamId)}>
                  Open PlayBox
                </ButtonLink>
              </div>
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  const blocked = teams.workspaces[0];
  return (
    <PlayBoxBlockedState
      status={blocked?.membershipStatus ?? null}
      teamId={blocked?.teamId ?? null}
    />
  );
}
