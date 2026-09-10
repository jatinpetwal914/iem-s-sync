export function shouldApplyRevision(incoming: number, current: number): boolean {
  return Number.isFinite(incoming) && Number.isFinite(current) && incoming > current;
}

export function isDuplicateRevision(incoming: number, current: number): boolean {
  return incoming === current;
}

export function isStaleRevision(incoming: number, current: number): boolean {
  return incoming < current;
}
