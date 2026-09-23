import { createHazardReports } from "@/services/dispatch.service";
import { getAllMapPoints, getMapPointDetail } from "@/services/map.service";
import type {
  CreateHazardReportPayload,
  MapPointDetailRes,
  MapPointFilterRequest,
  MapPointRes,
} from "@/types/map";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const mapQueryKeys = {
  all: ["mapPoints"] as const,
  list: (filter?: MapPointFilterRequest) => ["mapPoints", filter] as const,
  detail: (pointId?: string | null) => ["mapPointDetail", pointId] as const,
};

export interface UseMapPointsOptions {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
}

/**
 * Hook truy vấn danh sách điểm bản đồ (SOS, Hazard, SafePoint, Warehouse) theo bộ lọc
 */
export function useMapPointsQuery(
  filter?: MapPointFilterRequest,
  options?: UseMapPointsOptions,
) {
  return useQuery<MapPointRes[]>({
    queryKey: mapQueryKeys.list(filter),
    queryFn: () => getAllMapPoints(filter),
    staleTime: options?.staleTime ?? 1000 * 60 * 5,
    refetchInterval: options?.refetchInterval ?? 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook truy vấn chi tiết một điểm bản đồ theo ID
 */
export function useMapPointDetailQuery(
  pointId?: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery<MapPointDetailRes | null>({
    queryKey: mapQueryKeys.detail(pointId),
    queryFn: async () => {
      if (!pointId) return null;
      return await getMapPointDetail(pointId);
    },
    enabled: Boolean(pointId) && (options?.enabled ?? true),
  });
}

/**
 * Mutation báo cáo điểm nguy hiểm (Hazard Report)
 */
export function useCreateHazardReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateHazardReportPayload | FormData) => {
      return await createHazardReports(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mapQueryKeys.all });
    },
  });
}
