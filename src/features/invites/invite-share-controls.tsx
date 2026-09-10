"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type InviteShareControlsProps = {
  inviteUrl: string;
  expiresAt: string | null;
  maxUses: number | null;
  notice: string | null;
};

export function InviteShareControls({
  inviteUrl,
  expiresAt,
  maxUses,
  notice,
}: InviteShareControlsProps) {
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    const shareText = `Join my IEM Sync team: ${inviteUrl}`;

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "IEM Sync invitation",
          text: "Join my IEM Sync team",
          url: inviteUrl,
        });
        setShareMessage("Share sheet opened.");
        return;
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
    }

    window.open(whatsAppShareUrl(shareText), "_blank", "noopener,noreferrer");
    setShareMessage("Opened a WhatsApp share link.");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/8 p-4">
      {notice ? (
        <p className="text-sm leading-6 text-sync" role="status">
          {notice}
        </p>
      ) : null}
      <p className="break-all font-mono text-xs leading-5 text-foreground">
        {inviteUrl}
      </p>
      <p className="text-sm leading-6 text-muted">
        {maxUses ? `${maxUses} uses` : null}
        {maxUses && expiresAt ? " · " : null}
        {expiresAt ? `Expires ${formatExpiry(expiresAt)}` : null}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="ghost" onClick={() => void copyLink()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button type="button" variant="accent" onClick={() => void shareLink()}>
          Share via WhatsApp
        </Button>
      </div>
      {shareMessage ? (
        <p className="text-sm leading-6 text-muted" role="status">
          {shareMessage}
        </p>
      ) : null}
    </div>
  );
}

function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function formatExpiry(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
