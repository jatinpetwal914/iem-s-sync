import {
  isDuplicateRevision,
  isStaleRevision,
  shouldApplyRevision,
} from "@/lib/sync/revision";

export class SessionRevisionGate {
  private current = -1;

  get revision(): number {
    return this.current;
  }

  reset(revision = -1): void {
    this.current = revision;
  }

  evaluate(incoming: number): "apply" | "duplicate" | "stale" | "invalid" {
    if (!Number.isFinite(incoming)) {
      return "invalid";
    }
    if (shouldApplyRevision(incoming, this.current)) {
      return "apply";
    }
    if (isDuplicateRevision(incoming, this.current)) {
      return "duplicate";
    }
    if (isStaleRevision(incoming, this.current)) {
      return "stale";
    }
    return "invalid";
  }

  apply(incoming: number): boolean {
    if (this.evaluate(incoming) !== "apply") {
      return false;
    }
    this.current = incoming;
    return true;
  }
}
