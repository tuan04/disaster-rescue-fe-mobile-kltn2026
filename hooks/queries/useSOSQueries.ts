import {
  getActiveSyncedSOSRequests,
  getAllSOSRequests,
  type CreateSOSInput,
  type MySOSRequestEntity,
} from "@/database/sos-request.repository";
import {
  submitSOSRequest,
  type SubmitSOSResult,
} from "@/services/sos-sync.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const sosQueryKeys = {
  all: ["my-sos-requests"] as const,
  activeSynced: ["active-synced-sos"] as const,
};

export interface UseMySOSRequestsOptions {
  enabled?: boolean;
}

/**
 * Hook truy vấn toàn bộ lịch sử yêu cầu cứu hộ SOS của thiết bị (lưu trong SQLite offline-first)
 */
export function useMySOSRequestsQuery(options?: UseMySOSRequestsOptions) {
  return useQuery<MySOSRequestEntity[]>({
    queryKey: sosQueryKeys.all,
    queryFn: getAllSOSRequests,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook truy vấn danh sách các yêu cầu SOS đã đồng bộ máy chủ và đang active
 * Thường dùng cho polling/watcher theo dõi trạng thái ca cứu hộ
 */
export function useActiveSyncedSOSQuery(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  return useQuery<MySOSRequestEntity[]>({
    queryKey: sosQueryKeys.activeSynced,
    queryFn: getActiveSyncedSOSRequests,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? 15000,
  });
}

/**
 * Mutation gửi yêu cầu cứu hộ khẩn cấp SOS (hỗ trợ cả Online và Offline)
 */
export function useSubmitSOSMutation() {
  const queryClient = useQueryClient();

  return useMutation<SubmitSOSResult, Error, CreateSOSInput>({
    mutationFn: async (input: CreateSOSInput) => {
      return await submitSOSRequest(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sosQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: sosQueryKeys.activeSynced });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
    },
  });
}
