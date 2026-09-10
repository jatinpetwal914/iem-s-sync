import { listActiveInvites } from "@/features/invites/queries";
import { GenerateInviteForm } from "@/features/invites/generate-invite-form";
import { ActiveInvitesList } from "@/features/invites/active-invites-list";
import { Panel } from "@/components/ui/panel";
import { ErrorState } from "@/components/ui/error-state";

type InviteManagementPanelProps = {
  teamId: string;
};

export async function InviteManagementPanel({
  teamId,
}: InviteManagementPanelProps) {
  const invites = await listActiveInvites(teamId);

  if (!invites.ok) {
    return <ErrorState title="Could not load invitations" message={invites.message} />;
  }

  return (
    <Panel>
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
        INVITATIONS
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">
        Generate a link, copy or share it, then revoke it if it should stop
        working. Raw tokens are not stored.
      </p>
      <div className="mt-6">
        <GenerateInviteForm teamId={teamId} />
      </div>
      <div className="mt-8">
        <p className="font-mono text-[10px] tracking-[0.22em] text-muted">
          ACTIVE INVITATIONS
        </p>
        <div className="mt-4">
          <ActiveInvitesList teamId={teamId} invites={invites.invites} />
        </div>
      </div>
    </Panel>
  );
}
