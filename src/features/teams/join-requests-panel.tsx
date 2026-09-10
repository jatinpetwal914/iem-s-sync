import { listJoinRequests } from "@/features/teams/queries";
import { JoinRequestsList } from "@/features/teams/join-requests-list";
import { Panel } from "@/components/ui/panel";
import { ErrorState } from "@/components/ui/error-state";

type JoinRequestsPanelProps = {
  teamId: string;
};

export async function JoinRequestsPanel({ teamId }: JoinRequestsPanelProps) {
  const requests = await listJoinRequests(teamId);

  if (!requests.ok) {
    return (
      <ErrorState title="Could not load join requests" message={requests.message} />
    );
  }

  return (
    <Panel>
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
        JOIN REQUESTS
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">
        Approve a pending member to connect them to PlayBox. Rejected members
        cannot access PlayBox.
      </p>
      <div className="mt-6">
        <JoinRequestsList teamId={teamId} requests={requests.requests} />
      </div>
    </Panel>
  );
}
