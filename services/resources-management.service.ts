import type { ApiResponse } from "@/types/response";
import { post } from "./api";

export interface UpdateTeamLocationRequest {
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
}

/**
 * Gửi cập nhật vị trí thời gian thực của đội cứu hộ
 **/
export const updateTeamLocation = async <T = unknown>(
  payload: UpdateTeamLocationRequest,
): Promise<ApiResponse<T>> => {
  const response = await post<T>("/campaign-teams/location", payload);
  return response;
};
