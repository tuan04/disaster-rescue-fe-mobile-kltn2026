import type { AssignmentRes } from "../types/assignment";
import type { ApiResponse } from "../types/response";
import { post } from "./api";

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
