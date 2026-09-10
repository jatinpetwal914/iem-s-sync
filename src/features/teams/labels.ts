import { isUserRole } from "@/types/roles";
import { membershipStatuses, syncQualities } from "@/types/session";
import type { MembershipStatus, SyncQuality } from "@/types/session";
import type { UserRole } from "@/types/roles";

export function asUserRole(value: string): UserRole | null {
  return isUserRole(value) ? value : null;
}

export function asMembershipStatus(value: string): MembershipStatus | null {
  return (membershipStatuses as readonly string[]).includes(value)
    ? (value as MembershipStatus)
    : null;
}

export function asSyncQuality(value: string | null | undefined): SyncQuality {
  if (value && (syncQualities as readonly string[]).includes(value)) {
    return value as SyncQuality;
  }

  return "OFFLINE";
}

export function connectionStatusLabel(status: SyncQuality): string {
  switch (status) {
    case "EXCELLENT":
      return "Excellent";
    case "GOOD":
      return "Good";
    case "UNSTABLE":
      return "Unstable";
    case "OFFLINE":
      return "Offline";
  }
}

export function membershipStatusLabel(status: MembershipStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "removed":
      return "Removed";
  }
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "MEMBER":
      return "Member";
  }
}
