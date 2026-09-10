import { Panel } from "@/components/ui/panel";
import { getTeamBeatSession } from "@/features/sessions/queries";
import { listJoinRequests } from "@/features/teams/queries";
import type { TeamWorkspace } from "@/features/teams/types";
import { genres } from "@/config/genres";
import { canReviewJoinRequests } from "@/types/permissions";

export async function DashboardSessionStrip({
  workspaces,
}: {
  workspaces: TeamWorkspace[];
}) {
  const cards = [];

  for (const workspace of workspaces) {
    if (workspace.membershipStatus !== "approved") {
      continue;
    }
    const result = await getTeamBeatSession(workspace.teamId);
    if (!result.ok) {
      continue;
    }
    const genre = genres.find((entry) => entry.id === result.session?.genreId);
    let pending = 0;
    if (canReviewJoinRequests(workspace.role, workspace.membershipStatus)) {
      const requests = await listJoinRequests(workspace.teamId);
      pending = requests.ok ? requests.requests.length : 0;
    }
    cards.push({
      teamId: workspace.teamId,
      teamName: workspace.teamName,
      members: workspace.memberCount,
      pending,
      connection: workspace.connectionStatus,
      status: result.session?.status ?? "idle",
      bpm: result.session?.bpm ?? null,
      genre: genre?.shortName ?? "—",
      revision: result.session?.revision ?? 0,
    });
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <Panel>
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
        ACTIVE SESSION
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div key={card.teamId}>
            <p className="text-lg font-semibold">{card.teamName}</p>
            <p className="mt-1 font-mono text-xs leading-5 text-muted">
              {card.status.toUpperCase()} · {card.bpm ?? "—"} BPM · {card.genre}
              <br />
              members {card.members ?? "—"} · pending {card.pending} · sync{" "}
              {card.connection} · r{card.revision}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
