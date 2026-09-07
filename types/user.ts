import type { Sex, UserRole } from "./auth";

export type RoleInTeam = "LEADER" | "MEMBER";
export type VerifiedStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface VolunteerProfileResponse {
  cccdNumber?: string;
  teamId?: string | null;
  teamName?: string | null;
  description?: string | null;
  currentRoleInTeam?: RoleInTeam | null;
  verifiedStatus?: VerifiedStatus | null;
}

export interface UserProfileResponse {
  id: string;
  fullName: string;
  phone: string;
  sex?: Sex | null;
  avatarUrl?: string | null;
  role: UserRole;
  birthDate?: string | null;
  volunteerProfile?: VolunteerProfileResponse | null;
}

export interface UpgradeRescuerRequest {
  id: string;
  CCCD: string;
}

export interface UpgradeRescuerFormValues {
  id: string;
  CCCD: string;
}
