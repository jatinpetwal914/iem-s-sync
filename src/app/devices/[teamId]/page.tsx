import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { requireStudioTeam } from "@/features/studio/access";
import { getTeamBeatSession } from "@/features/sessions/queries";
import { DevicesConsole } from "@/features/sessions/devices-console";
import { canControlTeamSession } from "@/types/permissions";
import { playboxRoute, routes } from "@/config/routes";

type PageProps = { params: Promise<{ teamId: string }> };

export const metadata: Metadata = { title: "Devices" };
export const dynamic = "force-dynamic";

export default async function DevicesTeamPage({ params }: PageProps) {
  const { teamId } = await params;
  const access = await requireStudioTeam(teamId);
  if (access.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (access.status === "error") {
    return <ErrorState message={access.message} />;
  }
  if (access.status === "forbidden") {
    return (
      <EmptyState
        title="Devices unavailable"
        message={access.message}
        actionHref={routes.dashboard}
        actionLabel="Dashboard"
      />
    );
  }
  if (!canControlTeamSession(access.workspace.role, access.workspace.membershipStatus)) {
    redirect(playboxRoute(teamId));
  }

  const sessionResult = await getTeamBeatSession(teamId);
  if (!sessionResult.ok) {
    return <ErrorState message={sessionResult.message} />;
  }

  return (
    <DevicesConsole
      teamId={teamId}
      teamName={access.workspace.teamName}
      userId={access.user.id}
      initialSession={sessionResult.session}
    />
  );
}
