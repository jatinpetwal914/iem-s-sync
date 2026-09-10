import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { BeatControlConsole } from "@/features/sessions/beat-control-console";
import { requireStudioTeam } from "@/features/studio/access";
import { ensureTeamBeatSession } from "@/features/sessions/queries";
import { canControlTeamSession } from "@/types/permissions";
import { playboxRoute, routes } from "@/config/routes";

type PageProps = { params: Promise<{ teamId: string }> };

export const metadata: Metadata = { title: "Beat Control" };
export const dynamic = "force-dynamic";

export default async function BeatControlTeamPage({ params }: PageProps) {
  const { teamId } = await params;
  const access = await requireStudioTeam(teamId);

  if (access.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (access.status === "error") {
    return <ErrorState title="Could not load Beat Control" message={access.message} />;
  }
  if (access.status === "forbidden") {
    return (
      <EmptyState
        eyebrow="UNAUTHORIZED"
        title="Beat Control is not available"
        message={access.message}
        actionHref={routes.dashboard}
        actionLabel="Back to dashboard"
      />
    );
  }

  if (!canControlTeamSession(access.workspace.role, access.workspace.membershipStatus)) {
    redirect(playboxRoute(teamId));
  }

  const ensured = await ensureTeamBeatSession(teamId);
  if (!ensured.ok) {
    return <ErrorState title="Could not open the master session" message={ensured.message} />;
  }

  return (
    <BeatControlConsole
      teamId={teamId}
      teamName={access.workspace.teamName}
      userId={access.user.id}
      initialSession={ensured.session}
    />
  );
}
