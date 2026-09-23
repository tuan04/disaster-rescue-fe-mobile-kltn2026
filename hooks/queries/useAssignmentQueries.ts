import {
  acceptRescueRequest,
  cancelAssignment,
  completeAssignment,
  getActiveAssignmentByRequestId,
  getActiveMission,
} from "@/services/assignment.service";
import type { AssignmentRes } from "@/types/assignment";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const assignmentQueryKeys = {
  all: ["assignments"] as const,
  byRequest: (requestId?: string | null) =>
    ["activeAssignmentByRequest", requestId] as const,
  activeByTeam: (teamId?: string | null) =>
    ["activeMissionByTeam", teamId] as const,
};

export interface UseActiveAssignmentOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook truy vấn ca cứu hộ đang hoạt động theo requestId (Citizen xem thông tin đội cứu hộ)
 */
export function useActiveAssignmentByRequest(
  requestId?: string | null,
  options?: UseActiveAssignmentOptions,
) {
  return useQuery<AssignmentRes | null>({
    queryKey: assignmentQueryKeys.byRequest(requestId),
    queryFn: async () => {
      if (!requestId) return null;
      const res = await getActiveAssignmentByRequestId(requestId);
      return res.data ?? null;
    },
    enabled: Boolean(requestId) && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 30000,
  });
}

export function useActiveMissionByTeam(
  teamId?: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery<AssignmentRes | null>({
    queryKey: assignmentQueryKeys.activeByTeam(teamId),
    queryFn: async () => {
      if (!teamId) return null;
      const res = await getActiveMission(teamId);
      return res.data ?? null;
    },
    enabled: Boolean(teamId) && (options?.enabled ?? true),
  });
}

export function useAcceptAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      leaderId,
      note,
    }: {
      requestId: string;
      leaderId: string;
      note?: string;
    }) => {
      return await acceptRescueRequest(requestId, leaderId, note);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: assignmentQueryKeys.byRequest(variables.requestId),
      });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
    },
  });
}

export function useCompleteAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      return await completeAssignment(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
    },
  });
}

/**
 * Mutation: Hủy tiếp nhận ca cứu hộ
 */
export function useCancelAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      reason,
    }: {
      assignmentId: string;
      reason: string;
    }) => {
      return await cancelAssignment(assignmentId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
    },
  });
}
