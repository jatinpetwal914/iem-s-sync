export type AuthActionState = {
  status: "idle" | "error" | "needs_confirmation";
  issues: string[];
  message: string | null;
};

export const idleAuthActionState: AuthActionState = {
  status: "idle",
  issues: [],
  message: null,
};
