export function sessionChannelName(teamId: string): string {
  return `team-session:${teamId}`;
}

export function presenceChannelName(teamId: string): string {
  return `team-presence:${teamId}`;
}

export function membershipChannelName(teamId: string): string {
  return `team-members:${teamId}`;
}

export function performanceChannelName(teamId: string): string {
  return `team-performance:${teamId}`;
}
