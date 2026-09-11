import {
  clearActiveMission,
  getActiveMission,
  saveActiveMission,
} from "@/database";
import { ACTIVE_MISSION_QUERY_KEY } from "@/hooks/useActiveMission";
import {
  acceptRescueRequest,
  cancelAssignment,
  completeAssignment,
} from "@/services/assignment.service";
import { getRoute } from "@/services/map.service";
import type { RootState } from "@/store";
import type { MapPointDetailRes } from "@/types/map";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";
import { useLocation } from "@/hooks/useLocation";
import { useSelector } from "react-redux";

export interface UseRescueProps {
  isRealLocation?: boolean;
  permissionDenied?: boolean;
  refreshLocation?: () => Promise<boolean>;
  currentLat?: number;
  currentLng?: number;
  detailSheetRef?: React.RefObject<BottomSheetModal | null>;
}

export function useRescue(props: UseRescueProps = {}) {
  const sharedLoc = useLocation();

  const isRealLocation = props.isRealLocation ?? sharedLoc.isRealLocation;
  const permissionDenied = props.permissionDenied ?? sharedLoc.permissionDenied;
  const refreshLocation = props.refreshLocation ?? sharedLoc.refresh;
  const currentLat =
    props.currentLat ??
    (sharedLoc.isRealLocation ? sharedLoc.coords.latitude : 0);
  const currentLng =
    props.currentLng ??
    (sharedLoc.isRealLocation ? sharedLoc.coords.longitude : 0);
  const detailSheetRef = props.detailSheetRef;

  const queryClient = useQueryClient();
  const router = useRouter();
  const user = useSelector((state: RootState) => state.auth?.user);

  const acceptRescueMutation = useMutation({
    mutationFn: ({
      requestId,
      leaderId,
    }: {
      requestId: string;
      pointId: string;
      leaderId: string;
      detail: MapPointDetailRes;
    }) => acceptRescueRequest(requestId, leaderId),
    onSuccess: async (res, { requestId, pointId, leaderId, detail }) => {
      Toast.show({
        type: "success",
        text1: "Thành công",
        text2: "Đã tiếp nhận ca cứu hộ thành công!",
      });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      queryClient.invalidateQueries({ queryKey: ["mapPointDetail", pointId] });
      detailSheetRef?.current?.dismiss();

      let routeData = null;
      if (currentLat && currentLng) {
        try {
          routeData = await getRoute(currentLat, currentLng, requestId);
        } catch (routeErr) {
          console.warn("[useRescue] Lỗi tính lộ trình:", routeErr);
        }
      }

      // Lưu trạng thái và tuyến đường vào SQLite để offline/reload không bị mất
      try {
        await saveActiveMission({
          id: res?.data?.id,
          requestId,
          targetLatitude: detail.latitude,
          targetLongitude: detail.longitude,
          address: detail.address,
          reporterPhone:
            detail.pointType === "SOS" ? detail.detail.reporterPhone : null,
          routeData,
        });
        queryClient.invalidateQueries({ queryKey: ACTIVE_MISSION_QUERY_KEY });
      } catch (e) {
        console.warn("[useRescue] Lỗi khi lưu SQLite active mission:", e);
      }

      // Tự động chuyển hướng sang màn hình dẫn đường chuyên dụng
      router.push("/(pages)/mission-navigation");
    },
    onError: (error: any) => {
      console.log(error);
      Toast.show({
        type: "error",
        text1: "Lỗi tiếp nhận",
        text2:
          error?.message ||
          "Không thể tiếp nhận ca cứu hộ. Vui lòng thử lại sau.",
      });
    },
  });

  const handleRescue = useCallback(
    async (detail: MapPointDetailRes) => {
      if (detail.pointType !== "SOS") return;

      let success = isRealLocation;
      if (!success && refreshLocation) {
        success = await refreshLocation();
      }

      if (!success || permissionDenied) {
        Toast.show({
          type: "warning",
          text1: "Yêu cầu bật vị trí",
          text2:
            "Bạn bắt buộc phải bật GPS định vị thực tế của thiết bị và cấp quyền vị trí để thực hiện nhận cứu hộ.",
        });
        return;
      }

      Alert.alert(
        "Xác nhận nhận cứu hộ",
        "Bạn có chắc chắn muốn nhận ca cứu hộ này không?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Nhận ca",
            style: "destructive",
            onPress: () =>
              acceptRescueMutation.mutate({
                requestId: detail.detail.id,
                pointId: detail.id,
                leaderId: user?.id || "",
                detail,
              }),
          },
        ],
      );
    },
    [
      acceptRescueMutation,
      user?.id,
      isRealLocation,
      permissionDenied,
      refreshLocation,
    ],
  );

  // Hủy ca cứu hộ
  const handleCancelMission = useCallback(
    (onBeforeLeave?: (() => Promise<void> | void) | unknown) => {
      Alert.alert(
        "Xác nhận hủy dẫn đường",
        "Bạn có chắc chắn muốn hủy ca cứu hộ này và quay về bản đồ không?",
        [
          { text: "Không", style: "cancel" },
          {
            text: "Đồng ý hủy",
            style: "destructive",
            onPress: async () => {
              await clearActiveMission();
              if (typeof onBeforeLeave === "function") {
                await onBeforeLeave();
              }
              queryClient.invalidateQueries({
                queryKey: ACTIVE_MISSION_QUERY_KEY,
              });
              Toast.show({
                type: "info",
                text1: "Đã hủy ca cứu hộ",
                text2: "Đã kết thúc lộ trình dẫn đường.",
              });
              router.replace("/(app)/map");
            },
          },
        ],
      );
    },
    [queryClient, router],
  );

  const completeRescueMutation = useMutation({
    mutationFn: ({
      assignmentId,
    }: {
      assignmentId: string;
      onBeforeLeave?: () => Promise<void> | void;
    }) => completeAssignment(assignmentId),
    onSuccess: async (_, { onBeforeLeave }) => {
      try {
        await clearActiveMission();
      } catch (err) {
        console.warn("[useRescue] Lỗi dọn dẹp active mission:", err);
      }

      if (typeof onBeforeLeave === "function") {
        try {
          await onBeforeLeave();
        } catch (e) {
          console.warn("[useRescue] Lỗi onBeforeLeave:", e);
        }
      }

      queryClient.invalidateQueries({
        queryKey: ACTIVE_MISSION_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: ["mapPoints"],
      });
      queryClient.invalidateQueries({
        queryKey: ["mapPointDetail"],
      });

      Toast.show({
        type: "success",
        text1: "Đã hoàn thành ca cứu hộ",
      });

      router.replace("/(app)/map");
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Lỗi hoàn thành",
        text2:
          error?.message ||
          "Không thể hoàn thành ca cứu hộ. Vui lòng thử lại sau.",
      });
    },
  });

  // Hoàn thành ca cứu hộ
  const handleCompleteMission = useCallback(
    (
      assignmentIdOrFn?: string | ((...args: any[]) => any) | unknown,
      maybeOnBeforeLeave?: (() => Promise<void> | void) | unknown,
    ) => {
      let customAssignmentId: string | undefined;
      let onBeforeLeave: (() => Promise<void> | void) | undefined;

      if (typeof assignmentIdOrFn === "string") {
        customAssignmentId = assignmentIdOrFn;
        if (typeof maybeOnBeforeLeave === "function") {
          onBeforeLeave = maybeOnBeforeLeave as () => Promise<void> | void;
        }
      } else if (typeof assignmentIdOrFn === "function") {
        onBeforeLeave = assignmentIdOrFn as () => Promise<void> | void;
      }

      Alert.alert(
        "Hoàn thành ca cứu hộ",
        "Xác nhận đội cứu hộ đã tiếp cận và hoàn thành nhiệm vụ này?",
        [
          { text: "Chưa", style: "cancel" },
          {
            text: "Xác nhận hoàn thành",
            style: "default",
            onPress: async () => {
              let targetId = customAssignmentId;
              if (!targetId) {
                const localMission = await getActiveMission();
                targetId = localMission?.id;
              }

              if (!targetId) {
                Toast.show({
                  type: "error",
                  text1: "Lỗi",
                  text2: "Không tìm thấy thông tin ca cứu hộ để hoàn thành.",
                });
                return;
              }

              completeRescueMutation.mutate({
                assignmentId: targetId,
                onBeforeLeave,
              });
            },
          },
        ],
      );
    },
    [completeRescueMutation],
  );

  const cancelRescueMutation = useMutation({
    mutationFn: ({
      assignmentId,
      reason,
    }: {
      assignmentId: string;
      reason: string;
      onBeforeLeave?: () => Promise<void> | void;
    }) => cancelAssignment(assignmentId, reason),
    onSuccess: async (_, { onBeforeLeave }) => {
      try {
        await clearActiveMission();
      } catch (err) {
        console.warn("[useRescue] Lỗi dọn dẹp active mission:", err);
      }

      if (typeof onBeforeLeave === "function") {
        try {
          await onBeforeLeave();
        } catch (e) {
          console.warn("[useRescue] Lỗi onBeforeLeave:", e);
        }
      }

      queryClient.invalidateQueries({
        queryKey: ACTIVE_MISSION_QUERY_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: ["mapPoints"],
      });
      queryClient.invalidateQueries({
        queryKey: ["mapPointDetail"],
      });

      Toast.show({
        type: "info",
        text1: "Đã hủy ca cứu hộ",
        text2: "Ca cứu hộ đã được đưa về danh sách chờ.",
      });

      router.replace("/(app)/map");
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Lỗi hủy ca cứu hộ",
        text2:
          error?.response?.data?.message ||
          error?.message ||
          "Không thể hủy ca cứu hộ lúc này.",
      });
    },
  });

  return {
    handleRescue,
    handleCancelMission,
    handleCompleteMission,
    acceptRescueMutation,
    completeRescueMutation,
    cancelRescueMutation,
    isAccepting: acceptRescueMutation.isPending,
    isCompleting: completeRescueMutation.isPending,
    isCanceling: cancelRescueMutation.isPending,
  };
}
