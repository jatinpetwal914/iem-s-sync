import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayBoxConsole } from "@/features/playbox/playbox-console";
import { PlayBoxBlockedState } from "@/features/playbox/playbox-blocked-state";
import { requireStudioTeam } from "@/features/studio/access";
import { getTeamBeatSession, ensureTeamBeatSession } from "@/features/sessions/queries";
import { canAccessPlayBox, canControlTeamSession } from "@/types/permissions";
import { routes } from "@/config/routes";

type PlayBoxPageProps = {
  params: Promise<{ teamId: string }>;
};

export const metadata: Metadata = {
  title: "PlayBox",
};

export const dynamic = "force-dynamic";

export default async function PlayBoxTeamPage({ params }: PlayBoxPageProps) {
  const { teamId } = await params;
  const access = await requireStudioTeam(teamId);

  if (access.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (access.status === "error") {
    return <ErrorState title="Could not verify session" message={access.message} />;
  }
  if (access.status === "forbidden") {
    return (
      <EmptyState
        eyebrow="UNAUTHORIZED"
        title="PlayBox is not available"
        message="You do not have membership on this team, so PlayBox stays closed."
        actionHref={routes.dashboard}
        actionLabel="Back to dashboard"
      />
    );
  }

  if (!canAccessPlayBox(access.workspace.membershipStatus)) {
    return (
      <PlayBoxBlockedState
        status={access.workspace.membershipStatus}
        teamId={access.workspace.teamId}
      />
    );
  }

  const sessionResult = canControlTeamSession(
    access.workspace.role,
    access.workspace.membershipStatus,
  )
    ? await ensureTeamBeatSession(teamId)
    : await getTeamBeatSession(teamId);
  if (!sessionResult.ok) {
    return <ErrorState title="Could not load PlayBox" message={sessionResult.message} />;
  }

  return (
    <PlayBoxConsole
      teamId={teamId}
      teamName={access.workspace.teamName}
      userId={access.user.id}
      initialSession={sessionResult.session}
    />
  );
}
