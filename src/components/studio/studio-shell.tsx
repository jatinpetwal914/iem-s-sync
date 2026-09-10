"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/branding/wordmark";
import { LogoutButton } from "@/features/auth/logout-button";
import { cn } from "@/utils/cn";
import {
  beatControlRoute,
  devicesRoute,
  playboxRoute,
  routes,
  sessionsRoute,
  teamRoute,
} from "@/config/routes";

export type StudioNavKey =
  | "dashboard"
  | "team"
  | "beat-control"
  | "playbox"
  | "sessions"
  | "devices"
  | "settings";

type StudioShellProps = {
  teamId: string | null;
  canControl: boolean;
  children: ReactNode;
};

export function StudioShell({ teamId, canControl, children }: StudioShellProps) {
  const pathname = usePathname();
  const resolvedTeamId = teamIdFromPath(pathname) ?? teamId;

  const links = [
    { href: routes.dashboard, label: "Dashboard", key: "dashboard" as const, admin: false },
    {
      href: resolvedTeamId ? teamRoute(resolvedTeamId) : routes.team,
      label: "My Team",
      key: "team" as const,
      admin: false,
    },
    {
      href: resolvedTeamId ? beatControlRoute(resolvedTeamId) : routes.beatControl,
      label: "Beat Control",
      key: "beat-control" as const,
      admin: true,
    },
    {
      href: resolvedTeamId ? playboxRoute(resolvedTeamId) : routes.playbox,
      label: "PlayBox",
      key: "playbox" as const,
      admin: false,
    },
    {
      href: resolvedTeamId ? sessionsRoute(resolvedTeamId) : routes.sessions,
      label: "Sessions",
      key: "sessions" as const,
      admin: true,
    },
    {
      href: resolvedTeamId ? devicesRoute(resolvedTeamId) : routes.devices,
      label: "Devices",
      key: "devices" as const,
      admin: true,
    },
    { href: routes.settings, label: "Settings", key: "settings" as const, admin: false },
  ].filter((link) => !link.admin || canControl);

  return (
    <div className="flex min-h-full overflow-x-hidden bg-[#07080d] text-foreground">
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-white/8 bg-[#090b12] px-4 py-6 md:flex">
        <Link href={routes.dashboard} className="px-2">
          <Wordmark />
        </Link>
        <nav className="mt-10 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 font-mono text-[11px] tracking-[0.18em] uppercase",
                isActive(pathname, link.href)
                  ? "bg-white/8 text-accent"
                  : "text-muted hover:bg-white/4 hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <LogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3 md:hidden">
          <Link href={routes.dashboard}>
            <Wordmark />
          </Link>
          <LogoutButton />
        </header>
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 gap-1 border-t border-white/8 bg-[#090b12]/95 px-2 py-2 backdrop-blur md:hidden">
          {(canControl
            ? [
                { href: resolvedTeamId ? beatControlRoute(resolvedTeamId) : routes.beatControl, label: "Control" },
                { href: resolvedTeamId ? playboxRoute(resolvedTeamId) : routes.playbox, label: "PlayBox" },
                { href: resolvedTeamId ? teamRoute(resolvedTeamId) : routes.team, label: "Team" },
              ]
            : [
                { href: resolvedTeamId ? playboxRoute(resolvedTeamId) : routes.playbox, label: "PlayBox" },
                { href: resolvedTeamId ? teamRoute(resolvedTeamId) : routes.team, label: "Session" },
                { href: routes.dashboard, label: "Connect" },
              ]
          ).map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "rounded-lg py-3 text-center font-mono text-[10px] tracking-[0.2em] uppercase",
                isActive(pathname, item.href) ? "bg-white/10 text-accent" : "text-muted",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function teamIdFromPath(pathname: string): string | null {
  const match = pathname.match(
    /\/(?:playbox|beat-control|team|sessions|devices)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  return match?.[1] ?? null;
}
