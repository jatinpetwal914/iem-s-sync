import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/features/auth/get-current-user";
import { Panel } from "@/components/ui/panel";
import { ErrorState } from "@/components/ui/error-state";
import { LatencyDisclaimer } from "@/components/studio/latency-disclaimer";
import { routes } from "@/config/routes";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (session.status === "unauthenticated") {
    redirect(routes.login);
  }
  if (session.status === "error") {
    return <ErrorState message={session.message} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-accent">SETTINGS</p>
      <h1 className="text-3xl font-semibold tracking-tight">Studio</h1>
      <Panel>
        <p className="font-mono text-[10px] tracking-[0.24em] text-muted">ACCOUNT</p>
        <p className="mt-3 text-lg font-semibold">
          {session.user.displayName || session.user.email}
        </p>
        <p className="mt-2 text-sm text-muted">{session.user.email}</p>
      </Panel>
      <Panel>
        <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
          MULTI-DEVICE TEST
        </p>
        <p className="mt-3 text-sm leading-6 text-muted">
          Device identity is stored in sessionStorage, not localStorage. Open
          Beat Control in one window and PlayBox in other windows or browsers to
          simulate Admin + Member 1 + Member 2 + Member 3.
        </p>
      </Panel>
      <Panel>
        <LatencyDisclaimer />
      </Panel>
    </div>
  );
}
