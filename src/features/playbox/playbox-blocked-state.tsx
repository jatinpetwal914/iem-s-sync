import { EmptyState } from "@/components/ui/empty-state";
import { membershipStatusLabel } from "@/features/teams/labels";
import { routes, teamRoute } from "@/config/routes";
import type { MembershipStatus } from "@/types/session";

export function PlayBoxBlockedState({
  status,
  teamId,
}: {
  status: MembershipStatus | null;
  teamId: string | null;
}) {
  const actionHref = teamId ? teamRoute(teamId) : routes.dashboard;
  const actionLabel = teamId ? "View team" : "Back to dashboard";

  if (status === "pending") {
    return (
      <EmptyState
        eyebrow="PENDING"
        title="PlayBox is locked until you are approved"
        message="Your membership request is waiting. You cannot access PlayBox before an owner approves you."
        actionHref={actionHref}
        actionLabel={actionLabel}
      />
    );
  }

  if (status === "rejected") {
    return (
      <EmptyState
        eyebrow="REJECTED"
        title="Your join request was rejected"
        message="You do not have PlayBox access. Ask the owner for a new invitation if that was a mistake."
        actionHref={routes.dashboard}
        actionLabel="Back to dashboard"
      />
    );
  }

  if (status === "removed") {
    return (
      <EmptyState
        eyebrow="REMOVED"
        title="Your access was removed"
        message="Removed members lose PlayBox immediately. Ask the owner for a new invitation to request access again."
        actionHref={routes.dashboard}
        actionLabel="Back to dashboard"
      />
    );
  }

  return (
    <EmptyState
      eyebrow="UNAUTHORIZED"
      title="PlayBox is not available"
      message={
        status
          ? `This workspace is ${membershipStatusLabel(status).toLowerCase()}. Only approved members can open PlayBox.`
          : "You need an approved team membership before you can open PlayBox."
      }
      actionHref={routes.dashboard}
      actionLabel="Back to dashboard"
    />
  );
}
