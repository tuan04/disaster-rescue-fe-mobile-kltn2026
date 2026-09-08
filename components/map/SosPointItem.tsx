import EmergencyLevelBadge from "@/components/common/EmergencyLevelBadge";
import { rescueStatusLabel } from "@/contants/mapPointLables";
import { useAppTheme } from "@/contants/theme";
import { formatDistance } from "@/helper/distance";
import type { EmergencyLevel, RequestStatus, SosMapPointRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface SosPointItemProps {
  item: SosMapPointRes & { distanceKm?: number };
  onPress: (id: string) => void;
  className?: string;
}

export default function SosPointItem({
  item,
  onPress,
  className = "",
}: SosPointItemProps) {
  const theme = useAppTheme();
  const distance = formatDistance(item.distanceKm);

  const isHighPriority = item.priority === "HIGH";
  const isPending = item.status === "PENDING";
  const isAccepted = item.status === "ACCEPTED";
  const isCompleted = item.status === "COMPLETED";

  const statusText =
    rescueStatusLabel[item.status as RequestStatus] || item.status;

  const getStatusBadge = () => {
    if (isPending) {
      return {
        bg: "bg-warning/10 border-warning/30",
        text: "text-warning",
        dot: "bg-warning",
        label: "Đang chờ cứu viện",
      };
    }
    if (isAccepted) {
      return {
        bg: "bg-secondary/10 border-secondary/30",
        text: "text-secondary",
        dot: "bg-secondary",
        label: "Đội đang tiếp cận",
      };
    }
    return {
      bg: "bg-success/10 border-success/30",
      text: "text-success",
      dot: "bg-success",
      label: "Đã an toàn",
    };
  };

  const statusConfig = getStatusBadge();

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      className={`mb-3.5 rounded-2xl bg-surface p-4 border ${
        isHighPriority
          ? "border-danger/30 shadow-sm"
          : "border-outline/15 shadow-sm"
      } active:opacity-85 ${className}`}
    >
      {/* Header: Emergency Icon + Title + Priority Badge */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Icon Badge */}
          <View
            className={`mr-3 h-12 w-12 items-center justify-center rounded-2xl border ${
              isHighPriority
                ? "bg-danger/10 border-danger/25"
                : "bg-danger/5 border-danger/15"
            }`}
          >
            <Ionicons
              name={isHighPriority ? "alert-circle" : "help-buoy"}
              size={24}
              color={theme.colors.danger}
            />
          </View>

          {/* Title & Coordinates/Distance */}
          <View className="flex-1 justify-center">
            <View className="flex-row items-center mb-0.5">
              <Text
                className="text-base font-bold text-text flex-1"
                numberOfLines={1}
              >
                {item.subType || "Yêu cầu cứu trợ khẩn cấp"}
              </Text>
            </View>

            {distance ? (
              <View className="flex-row items-center">
                <Ionicons
                  name="navigate"
                  size={12}
                  color={theme.colors.danger}
                />
                <Text className="ml-1 text-xs font-semibold text-danger">
                  Cách bạn {distance}
                </Text>
              </View>
            ) : (
              <Text className="text-[11px] text-text-muted">
                Tọa độ: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        </View>

        {/* Priority Badge */}
        <EmergencyLevelBadge
          level={(item.priority as EmergencyLevel) || "MEDIUM"}
        />
      </View>

      {/* Info Tag Row */}
      <View className="mt-3 flex-row items-center gap-2">
        <View
          className={`flex-row items-center rounded-full px-2.5 py-1 border ${statusConfig.bg}`}
        >
          <View className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusConfig.dot}`} />
          <Text className={`text-[11px] font-bold ${statusConfig.text}`}>
            {statusConfig.label}
          </Text>
        </View>

        <View className="rounded-full bg-surfaceVariant px-2.5 py-1 border border-outline/10">
          <Text className="text-[11px] font-medium text-text-muted">
            SOS Khẩn cấp
          </Text>
        </View>
      </View>

      {/* Bottom Footer */}
      <View className="mt-3 flex-row items-center justify-between border-t border-outline/10 pt-3">
        <View className="flex-row items-center flex-1 mr-2">
          <Ionicons
            name="time-outline"
            size={13}
            color={theme.colors.textMuted}
          />
          <Text
            className="ml-1 text-xs text-text-muted font-medium"
            numberOfLines={1}
          >
            {statusText}
          </Text>
        </View>

        <Pressable
          hitSlop={6}
          onPress={() => onPress(item.id)}
          className="flex-row items-center rounded-xl bg-danger/10 px-3 py-1.5 active:bg-danger/20"
        >
          <Text className="text-xs font-bold text-danger mr-1">Chi tiết</Text>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={theme.colors.danger}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}
