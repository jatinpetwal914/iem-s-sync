export const userRoles = ["OWNER", "ADMIN", "MEMBER"] as const;

export type UserRole = (typeof userRoles)[number];

export function isUserRole(value: string): value is UserRole {
  return (userRoles as readonly string[]).includes(value);
}
