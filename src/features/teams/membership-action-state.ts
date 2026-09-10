export type MembershipActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
};

export const idleMembershipActionState: MembershipActionState = {
  status: "idle",
  message: null,
};
