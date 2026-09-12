import { hazardTypeLabel } from "@/contants/mapPointLables";
import { getHazardIconDetails } from "@/contants/mapPointMeta";
import { useAppTheme } from "@/contants/theme";
import { formatDistance } from "@/helpers/route";
import type { HazardMapPointRes, HazardType } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

export interface HazardPointItemProps {
  item: HazardMapPointRes & { distanceKm?: number };
  onPress: (id: string) => void;
  className?: string;
}

export default function HazardPointItem({
  item,
  onPress,
  className = "",
}: HazardPointItemProps) {
  const theme = useAppTheme();
  const distance = formatDistance(item.distanceKm);

  const label =
    hazardTypeLabel[item.subType as HazardType] || "Điểm nguy hiểm";
  const iconDetails = getHazardIconDetails(item);
  const isActive = item.status === "ACTIVE";

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      className={`mb-3.5 rounded-2xl bg-surface p-4 border ${isActive ? "border-warning/30 shadow-sm" : "border-outline/15 shadow-sm"
        } active:opacity-85 ${className}`}
    >
      {/* Header: Hazard Icon + Title + Status Badge */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Icon Badge */}
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-warning/10 border border-warning/25">
            {iconDetails?.iconUrl ? (
              <Image
                source={iconDetails.iconUrl}
                className="h-7 w-7"
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name="warning"
                size={24}
                color={theme.colors.warning}
              />
            )}
          </View>

          {/* Title & Distance */}
          <View className="flex-1 justify-center">
            <Text
              className="text-base font-bold text-text mb-0.5"
              numberOfLines={1}
            >
              {label}
            </Text>

            {distance ? (
              <View className="flex-row items-center">
                <Ionicons
                  name="warning-outline"
                  size={12}
                  color={theme.colors.warning}
                />
                <Text className="ml-1 text-xs font-semibold text-warning">
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

        {/* Status Badge */}
        <View
          className={`rounded-full px-2.5 py-1 border ${isActive
            ? "bg-danger/10 border-danger/30"
            : "bg-success/10 border-success/30"
            }`}
        >
          <Text
            className={`text-[10px] font-bold ${isActive ? "text-danger" : "text-success"
              }`}
          >
            {isActive ? "Đang diễn ra" : "Đã an toàn"}
          </Text>
        </View>
      </View>

      {/* Safety Notice Strip */}
      <View className="mt-3 flex-row items-center rounded-xl bg-warning/5 px-3 py-2 border border-warning/15">
        <Ionicons
          name="information-circle-outline"
          size={14}
          color={theme.colors.warning}
        />
        <Text
          className="ml-1.5 text-[11px] text-text-muted font-medium flex-1"
          numberOfLines={1}
        >
          {isActive
            ? "Chú ý quan sát và tránh di chuyển qua tâm cảnh báo"
            : "Khu vực này đã được đội xử lý và an toàn trở lại"}
        </Text>
      </View>

      {/* Bottom Footer */}
      <View className="mt-3 flex-row items-center justify-between border-t border-outline/10 pt-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className={`h-2 w-2 rounded-full mr-1.5 ${isActive ? "bg-warning" : "bg-success"
              }`}
          />
          <Text
            className="text-xs text-text-muted font-medium"
            numberOfLines={1}
          >
            {isActive ? "Khu vực có rủi ro cao" : "Đã thông tuyến an toàn"}
          </Text>
        </View>

        <Pressable
          hitSlop={6}
          onPress={() => onPress(item.id)}
          className="flex-row items-center rounded-xl bg-warning/10 px-3 py-1.5 active:bg-warning/20"
        >
          <Text className="text-xs font-bold text-warning mr-1">
            Xem cảnh báo
          </Text>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={theme.colors.warning}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}
