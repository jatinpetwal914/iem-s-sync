export type TeamFormResult =
  | { ok: true; value: { name: string } }
  | { ok: false; issues: string[] };

const MAX_TEAM_NAME_LENGTH = 80;

export function parseTeamName(input: string): TeamFormResult {
  const name = input.trim().replace(/\s+/g, " ");
  const issues: string[] = [];

  if (!name) {
    issues.push("Team name is required");
  } else if (name.length > MAX_TEAM_NAME_LENGTH) {
    issues.push("Team name must be 80 characters or fewer");
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, value: { name } };
}
