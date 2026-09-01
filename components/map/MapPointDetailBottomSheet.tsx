import Button from "@/components/common/Button";
import EmergencyLevelBadge from "@/components/common/EmergencyLevelBadge";
import {
  hazardTypeLabel,
  pointTypeLabel,
  rescueStatusLabel,
  safePointTypeLabel,
} from "@/contants/mapPointLables";
import { getMapPointDetail } from "@/services/map.service";
import type { RootState } from "@/store";
import type { MapPointDetailRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  Text,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

export interface MapPointDetailBottomSheetProps {
  pointId: string | null;
  onDismiss?: () => void;
  snapPoints?: string[];
  onRescue?: (detail: MapPointDetailRes) => void;
  isAccepting?: boolean;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <View className="flex-row items-start justify-between py-2.5 border-b border-gray-100 dark:border-gray-800">
      <Text className="text-md font-medium text-text">
        {label}
      </Text>
      <View className="flex-1 items-end ml-4">
        {typeof value === "string" || typeof value === "number" ? (
          <Text className="text-md text-text text-right">
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

export const MapPointDetailBottomSheet = React.forwardRef<
  BottomSheetModal,
  MapPointDetailBottomSheetProps
>(({ pointId, onDismiss, snapPoints: customSnapPoints, onRescue, isAccepting = false }, ref) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth?.user);
  const isRescuer = user?.role === "RESCUER";

  const snapPoints = useMemo(
    () => customSnapPoints || ["60%", "90%"],
    [customSnapPoints],
  );

  const {
    data: detail,
    isLoading,
    isError,
    refetch,
  } = useQuery<MapPointDetailRes>({
    queryKey: ["mapPointDetail", pointId],
    queryFn: () => getMapPointDetail(pointId!),
    enabled: !!pointId,
  });

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

  const handleClose = () => {
    if (ref && "current" in ref && ref.current) {
      ref.current.dismiss();
    } else {
      onDismiss?.();
    }
  };

  const handleCallPhone = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch((err) =>
      console.error("Không thể thực hiện cuộc gọi", err),
    );
  };

  const getPhone = (data: MapPointDetailRes): string | undefined => {
    if (data.pointType === "SOS") return data.detail.reporterPhone;
    if (data.pointType === "SAFE_ZONE") return data.detail.contactPhone;
    if (data.pointType === "WARE_HOUSE") return data.detail.managerPhone;
    return undefined;
  };

  const renderDetailContent = (data: MapPointDetailRes) => {
    switch (data.pointType) {
      case "SOS":
        return (
          <View className="mt-1">
            <DetailRow label="Địa chỉ" value={data.address} />
            <DetailRow
              label="Mức độ khẩn cấp"
              value={<EmergencyLevelBadge level={data.detail.emergencyLevel} />}
            />
            <DetailRow
              label="Trạng thái"
              value={rescueStatusLabel[data.detail.status] || data.detail.status}
            />
            <DetailRow label="SĐT người báo" value={data.detail.reporterPhone} />
            <DetailRow
              label="Nguồn"
              value={data.detail.source}
            />
            <DetailRow label="Nội dung cầu cứu" value={data.detail.content} />
          </View>
        );

      case "HAZARD":
        return (
          <View className="mt-1">
            <DetailRow label="Địa chỉ" value={data.address} />
            <DetailRow
              label="Loại mối nguy"
              value={
                hazardTypeLabel[data.detail.hazardType] ||
                data.detail.hazardType
              }
            />
            <DetailRow
              label="Trạng thái"
              value={
                data.detail.status === "ACTIVE"
                  ? "Đang có hiệu lực"
                  : data.detail.status === "RESOLVED"
                    ? "Đã xử lý"
                    : data.detail.status === "REJECTED"
                      ? "Đã hủy"
                      : data.detail.status
              }
            />
            <DetailRow label="Mô tả" value={data.detail.description} />
            {data.detail.imageUrls && data.detail.imageUrls.length > 0 && (
              <View className="mt-3">
                <Text className="mb-2 text-sm font-semibold text-text">
                  Hình ảnh ghi nhận
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {data.detail.imageUrls.map((imgUrl, index) => (
                    <Image
                      key={index}
                      source={{ uri: imgUrl }}
                      className="h-20 w-20 rounded-lg bg-surface"
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        );

      case "SAFE_ZONE":
        return (
          <View className="mt-1">
            <DetailRow label="Tên điểm an toàn" value={data.detail.name} />
            <DetailRow label="Địa chỉ" value={data.address} />
            <DetailRow
              label="Loại điểm"
              value={
                safePointTypeLabel[data.detail.safePointType] ||
                data.detail.safePointType
              }
            />
            <DetailRow label="SĐT liên hệ" value={data.detail.contactPhone} />
          </View>
        );

      case "WARE_HOUSE":
        return (
          <View className="mt-1">
            <DetailRow label="Tên kho hàng" value={data.detail.name} />
            <DetailRow label="Địa chỉ" value={data.address} />
            <DetailRow label="SĐT quản lý" value={data.detail.managerPhone} />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      onDismiss={onDismiss}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.outline || "#9CA3AF",
      }}
    >
      {isLoading && (
        <View className="flex-1 items-center justify-center py-12">
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text className="mt-3 text-sm text-text-muted font-medium">
            Đang tải thông tin chi tiết...
          </Text>
        </View>
      )}

      {isError && !isLoading && (
        <View className="flex-1 items-center justify-center p-6 py-12">
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
          <Text className="mt-2 text-base font-bold text-text">
            Không thể tải thông tin
          </Text>
          <Text className="mt-1 text-center text-xs text-text-muted">
            Đã có lỗi xảy ra khi lấy dữ liệu điểm thảm họa này.
          </Text>
          <Button
            title="Thử lại"
            onPress={() => refetch()}
            variant="danger"
            style={{ marginTop: 16 }}
            contentStyle={{ minHeight: 40 }}
          />
        </View>
      )}

      {detail && !isLoading && (
        <BottomSheetScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
            <Text className="text-title font-bold text-text">
              {pointTypeLabel[detail.pointType]}
            </Text>
            <Pressable
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 items-center justify-center active:opacity-70"
            >
              <Ionicons name="close" size={18} color={theme.colors.onSurface} />
            </Pressable>
          </View>

          {renderDetailContent(detail)}

          {(() => {
            const phone = getPhone(detail);
            const showRescueButton = detail.pointType === "SOS";
            const isPending = detail.pointType === "SOS" && detail.detail.status === "PENDING";
            const canRescue = isRescuer && isPending && !isAccepting;

            if (!phone && !showRescueButton) return null;

            return (
              <View className="mt-6 flex-row gap-3">
                {showRescueButton && (
                  <Button
                    title={
                      isPending
                        ? "Cứu hộ"
                        : rescueStatusLabel[detail.detail.status] || detail.detail.status
                    }
                    onPress={() => canRescue && onRescue?.(detail)}
                    disabled={!canRescue}
                    loading={isAccepting}
                    variant="primary"
                    icon={({ size, color }) => (
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={size}
                        color={color}
                      />
                    )}
                    style={{ flex: 1 }}
                  />
                )}

                {phone && (
                  <Button
                    title="Gọi điện"
                    onPress={() => handleCallPhone(phone)}
                    variant="success"
                    icon={({ size, color }) => (
                      <Ionicons name="call-outline" size={size} color={color} />
                    )}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
            );
          })()}
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
});

MapPointDetailBottomSheet.displayName = "MapPointDetailBottomSheet";

export default MapPointDetailBottomSheet;