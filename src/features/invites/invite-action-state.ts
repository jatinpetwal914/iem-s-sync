export type CreateInviteState = {
  status: "idle" | "error" | "created";
  message: string | null;
  inviteUrl: string | null;
  expiresAt: string | null;
  maxUses: number | null;
};

export const idleCreateInviteState: CreateInviteState = {
  status: "idle",
  message: null,
  inviteUrl: null,
  expiresAt: null,
  maxUses: null,
};

export type RevokeInviteState = {
  status: "idle" | "error" | "success";
  message: string | null;
};

export const idleRevokeInviteState: RevokeInviteState = {
  status: "idle",
  message: null,
};
