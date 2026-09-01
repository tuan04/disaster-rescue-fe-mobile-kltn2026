import { ApiResponse } from "@/types/response";
import type { UpgradeRescuerRequest } from "@/types/user";
import { patch } from "./api";

export const upgradeToRescuer = async (
  payload: UpgradeRescuerRequest,
): Promise<ApiResponse<unknown>> => {
  const data = await patch<unknown>("/users/upgrade-rescuer-request", payload);
  return data;
};
