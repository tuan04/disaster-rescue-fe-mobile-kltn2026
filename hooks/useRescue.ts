import { acceptRescueRequest } from "@/services/assignment.service";
import type { RootState } from "@/store";
import type { MapPointDetailRes } from "@/types/map";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { Alert } from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";

export interface UseRescueProps {
  isRealLocation: boolean;
  permissionDenied: boolean;
  refreshLocation: () => Promise<boolean>;
  currentLat: number;
  currentLng: number;
  detailSheetRef?: React.RefObject<BottomSheetModal | null>;
  onRouteCalculated?: (
    startLat: number,
    startLng: number,
    requestId: string,
  ) => Promise<any>;
}

export function useRescue({
  isRealLocation,
  permissionDenied,
  refreshLocation,
  currentLat,
  currentLng,
  detailSheetRef,
  onRouteCalculated,
}: UseRescueProps) {
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.auth?.user);

  const acceptRescueMutation = useMutation({
    mutationFn: ({
      requestId,
      leaderId,
    }: {
      requestId: string;
      pointId: string;
      leaderId: string;
    }) => acceptRescueRequest(requestId, leaderId),
    onSuccess: async (_, { requestId, pointId }) => {
      Toast.show({
        type: "success",
        text1: "Thành công",
        text2: "Đã tiếp nhận ca cứu hộ thành công!",
      });
      queryClient.invalidateQueries({ queryKey: ["mapPoints"] });
      queryClient.invalidateQueries({ queryKey: ["mapPointDetail", pointId] });
      detailSheetRef?.current?.dismiss();

      if (onRouteCalculated) {
        await onRouteCalculated(currentLat, currentLng, requestId);
      }
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
      if (!success) {
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
                leaderId: user?.id || "3fa85f64-5717-4562-b3fc-2c963f66afa6",
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

  return {
    handleRescue,
    acceptRescueMutation,
    isAccepting: acceptRescueMutation.isPending,
  };
}
