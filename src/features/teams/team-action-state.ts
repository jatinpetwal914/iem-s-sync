export type TeamActionState = {
  status: "idle" | "error" | "success";
  issues: string[];
  message: string | null;
};

export const idleTeamActionState: TeamActionState = {
  status: "idle",
  issues: [],
  message: null,
};
