export type AssignmentStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELED";

export interface AssignmentRes {
  id: string;
  requestId: string;
  campaignTeamId: string;
  assignedTeamName: string;
  leaderName?: string;
  leaderPhone: string;
  status: AssignmentStatus;
  assignedAt?: string;
  respondedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface AcceptRescuePayload {
  notes?: string;
}

export interface TeamLocationPayload {
  teamId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  recordedAt?: string;
}

export interface UpdateTeamLocationRequest {
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
}
