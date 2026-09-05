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
