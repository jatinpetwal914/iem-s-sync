import type { Metadata } from "next";
import { getAuthSession } from "@/features/auth/get-current-user";
import { redeemInvite } from "@/features/invites/redeem";
import {
  GuestInvitePanel,
  InviteResultPanel,
} from "@/features/invites/invite-result-panel";
import { ErrorState } from "@/components/ui/error-state";
import { inviteRoute } from "@/config/routes";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export const metadata: Metadata = {
  title: "Invitation",
};

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const session = await getAuthSession();

  if (session.status === "unauthenticated") {
    return <GuestInvitePanel nextPath={inviteRoute(token)} />;
  }

  if (session.status === "error") {
    return (
      <ErrorState title="Could not verify session" message={session.message} />
    );
  }

  const result = await redeemInvite(token);
  return <InviteResultPanel result={result} token={token} />;
}
