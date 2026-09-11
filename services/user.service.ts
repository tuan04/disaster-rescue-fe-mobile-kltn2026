import { ApiResponse } from "@/types/response";
import type { UpgradeRescuerRequest, UserProfileResponse } from "@/types/user";
import { get, patch } from "./api";

export const getMyProfile = async (): Promise<
  ApiResponse<UserProfileResponse>
> => {
  const data = await get<UserProfileResponse>("/users/me");
  return data;
};

export const upgradeToRescuer = async (
  payload: UpgradeRescuerRequest,
): Promise<ApiResponse<unknown>> => {
  const data = await patch<unknown>("/users/upgrade-rescuer-request", payload);
  return data;
};
