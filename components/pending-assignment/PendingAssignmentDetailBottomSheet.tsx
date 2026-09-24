import EmergencyLevelBadge from "@/components/common/EmergencyLevelBadge";
import { useAppTheme } from "@/constants/theme";
import { formatDateTime } from "@/helpers/date";
import type { MapPointDetailRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export interface PendingAssignmentDetailBottomSheetProps {
  item: MapPointDetailRes | null;
  snapPoints?: string[];
  onCall?: (phone?: string) => void;
  onViewOnMap?: (item: MapPointDetailRes) => void;
  onReject?: (item: MapPointDetailRes) => void;
  onRescue?: (item: MapPointDetailRes) => void;
  isRescuing?: boolean;
  onDismiss?: () => void;
}

export const PendingAssignmentDetailBottomSheet = React.forwardRef<
  BottomSheetModal,
  PendingAssignmentDetailBottomSheetProps
>(
  (
    {
      item,
      snapPoints: customSnapPoints,
      onCall,
      onViewOnMap,
      onReject,
      onRescue,
      isRescuing = false,
      onDismiss,
    },
    ref,
  ) => {
    const theme = useAppTheme();

    const snapPoints = useMemo(
      () => customSnapPoints || ["65%", "90%"],
      [customSnapPoints],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      [],
    );

    const handleClose = useCallback(() => {
      if (ref && "current" in ref && ref.current) {
        ref.current.dismiss();
      } else {
        onDismiss?.();
      }
    }, [ref, onDismiss]);

    if (!item) return null;

    const isSos = item.pointType === "SOS";
    const phone = isSos ? item.detail.reporterPhone : undefined;
    const emergencyLevel = isSos ? item.detail.emergencyLevel : "MEDIUM";
    const source = isSos ? item.detail.source : "APP";
    const content = isSos ? item.detail.content : "";

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.outline,
          width: 40,
        }}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        onDismiss={onDismiss}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {/* Modal Header */}
          <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
            <View className="flex-row items-center">
              <View className="h-8 w-8 rounded-full bg-red-500/15 items-center justify-center mr-2.5">
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={theme.colors.danger}
                />
              </View>
              <Text className="text-base font-bold text-text">
                Chi tiết nhiệm vụ được gán
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center active:opacity-70"
            >
              <Ionicons
                name="close"
                size={18}
                color={theme.colors.onSurface}
              />
            </Pressable>
          </View>

          {/* Chi tiết nội dung */}
          <View className="space-y-3">
            {/* Mức độ khẩn cấp */}
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/60">
              <Text className="text-xs font-semibold text-textMuted">
                Mức độ khẩn cấp:
              </Text>
              <EmergencyLevelBadge level={emergencyLevel} />
            </View>

            {/* Địa chỉ */}
            <View className="py-2 border-b border-gray-100 dark:border-gray-800/60">
              <Text className="text-xs font-semibold text-textMuted mb-1">
                Địa chỉ cứu nạn:
              </Text>
              <View className="flex-row items-start">
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={theme.colors.danger}
                  style={{ marginTop: 2, marginRight: 4 }}
                />
                <Text className="flex-1 text-xs font-medium text-text leading-5">
                  {item.address ||
                    `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}`}
                </Text>
              </View>
            </View>

            {/* Tọa độ */}
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/60">
              <Text className="text-xs font-semibold text-textMuted">
                Tọa độ GPS:
              </Text>
              <Text className="text-xs font-mono text-text">
                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
              </Text>
            </View>

            {/* SĐT người báo */}
            {phone && (
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/60">
                <Text className="text-xs font-semibold text-textMuted">
                  SĐT người báo:
                </Text>
                <Text className="text-xs font-bold text-text">
                  {phone}
                </Text>
              </View>
            )}

            {/* Nguồn tiếp nhận */}
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/60">
              <Text className="text-xs font-semibold text-textMuted">
                Kênh tiếp nhận:
              </Text>
              <View className="rounded-md bg-slate-200 dark:bg-slate-700 px-2 py-0.5">
                <Text className="text-xs font-semibold text-text">
                  {source}
                </Text>
              </View>
            </View>

            {/* Thời gian tạo */}
            <View className="flex-row items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/60">
              <Text className="text-xs font-semibold text-textMuted">
                Thời gian ghi nhận:
              </Text>
              <Text className="text-xs text-text">
                {formatDateTime(item.createdAt)}
              </Text>
            </View>

            {/* Nội dung cầu cứu */}
            <View className="py-2">
              <Text className="text-xs font-semibold text-textMuted mb-1.5">
                Nội dung cầu cứu chi tiết:
              </Text>
              <View className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
                <Text className="text-xs text-text leading-5 font-normal">
                  {content || "(Không có nội dung mô tả chi tiết)"}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="mt-5 flex-row gap-3">
            {phone && (
              <Pressable
                onPress={() => onCall?.(phone)}
                className="flex-1 flex-row items-center justify-center rounded-xl bg-emerald-600 py-2.5 px-3 active:opacity-85 shadow-xs"
              >
                <Ionicons name="call" size={15} color="#ffffff" />
                <Text className="ml-1.5 text-xs font-bold text-white">
                  Gọi người báo
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                handleClose();
                onViewOnMap?.(item);
              }}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-700 py-2.5 px-3 active:opacity-85 shadow-xs"
            >
              <Ionicons name="map-outline" size={15} color={theme.colors.onSurface} />
              <Text className="ml-1.5 text-xs font-bold text-text">
                Xem bản đồ
              </Text>
            </Pressable>
          </View>

        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

PendingAssignmentDetailBottomSheet.displayName =
  "PendingAssignmentDetailBottomSheet";

export default PendingAssignmentDetailBottomSheet;
