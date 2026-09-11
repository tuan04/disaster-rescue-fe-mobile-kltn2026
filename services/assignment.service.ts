import type { AssignmentRes } from "../types/assignment";
import type { ApiResponse } from "../types/response";
import { get, post } from "./api";

export const acceptRescueRequest = async (
  requestId: string,
  leaderId: string,
  note: string = " ",
): Promise<ApiResponse<AssignmentRes>> => {
  const response = await post<AssignmentRes>(
    `/assignments/rescue-requests/${requestId}/accept`,
    null,
    {
      params: {
        leaderId,
        note,
      },
    },
  );
  return response;
};

export const getActiveMission = async (
  teamId: string,
): Promise<ApiResponse<AssignmentRes | null>> => {
  return await get<AssignmentRes | null>(`/assignments/teams/${teamId}/active`);
};

export const completeAssignment = async (
  assignmentId: string,
): Promise<void> => {
  await post<void>(`/assignments/${assignmentId}/complete`);
};

export const cancelAssignment = async (
  assignmentId: string,
  reason: string,
): Promise<void> => {
  await post<void>(`/assignments/${assignmentId}/cancel`, { reason });
};
