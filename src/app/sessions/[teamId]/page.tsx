import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { requireStudioTeam } from "@/features/studio/access";
import { getTeamBeatSession } from "@/features/sessions/queries";
import { canControlTeamSession } from "@/types/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { beatControlRoute, playboxRoute, routes } from "@/config/routes";
import { ButtonLink } from "@/components/ui/button";

type PageProps = { params: Promise<{ teamId: string }> };

export const metadata: Metadata = { title: "Sessions" };
export const dynamic = "force-dynamic";

export default async function SessionsTeamPage({ params }: PageProps) {
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
        title="Sessions unavailable"
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

  const events = sessionResult.session
    ? await loadEvents(sessionResult.session.id)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-8">
      <p className="font-mono text-[11px] tracking-[0.28em] text-accent">SESSIONS</p>
      <h1 className="text-3xl font-semibold tracking-tight">{access.workspace.teamName}</h1>
      <Panel>
        {sessionResult.session ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Row label="Session" value={sessionResult.session.id} />
            <Row label="Status" value={sessionResult.session.status} />
            <Row label="Revision" value={String(sessionResult.session.revision)} />
            <Row label="BPM" value={String(sessionResult.session.bpm)} />
            <Row label="Start at" value={sessionResult.session.startAt ?? "—"} />
            <Row label="Position beats" value={String(sessionResult.session.positionBeats)} />
          </dl>
        ) : (
          <p className="text-sm text-muted">No master session yet.</p>
        )}
        <div className="mt-6">
          <ButtonLink href={beatControlRoute(teamId)}>Open Beat Control</ButtonLink>
        </div>
      </Panel>
      <Panel>
        <p className="font-mono text-[10px] tracking-[0.24em] text-muted">
          CONTROL EVENTS
        </p>
        {events.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No transport events recorded.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2 font-mono text-xs text-muted">
            {events.map((event) => (
              <li key={event.id}>
                r{event.revision} · {event.event_type} · {event.occurred_at}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.2em] text-muted">{label}</dt>
      <dd className="mt-1 break-all text-sm">{value}</dd>
    </div>
  );
}

async function loadEvents(sessionId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("session_events")
    .select("id, event_type, revision, occurred_at")
    .eq("session_id", sessionId)
    .order("revision", { ascending: false })
    .limit(40);
  return data ?? [];
}
