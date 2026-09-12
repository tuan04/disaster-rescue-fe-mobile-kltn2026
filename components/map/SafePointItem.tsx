import { safePointTypeLabel } from "@/contants/mapPointLables";
import { getSafePointIconDetails } from "@/contants/mapPointMeta";
import { useAppTheme } from "@/contants/theme";
import { formatDistance } from "@/helpers/route";
import type { SafePointType, SafeZoneMapPointRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

export interface SafePointItemProps {
  item: SafeZoneMapPointRes & { distanceKm?: number };
  onPress: (id: string) => void;
  className?: string;
}

export default function SafePointItem({
  item,
  onPress,
  className = "",
}: SafePointItemProps) {
  const theme = useAppTheme();
  const distance = formatDistance(item.distanceKm);

  const label =
    safePointTypeLabel[item.subType as SafePointType] || "Điểm an toàn";
  const iconDetails = getSafePointIconDetails(item);
  const isActive = item.status !== "INACTIVE";

  const getServiceTag = (subType: string) => {
    switch (subType) {
      case "EVACUATION_CENTER":
        return "🏠 Chỗ ở an toàn & lương thực";
      case "MEDICAL_STATION":
        return "🩺 Cấp cứu, sơ cứu & thuốc men";
      case "WATER_STATION":
        return "💧 Cung cấp nước sạch miễn phí";
      case "TEMPORARY_CAMP":
        return "⛺ Trại lưu trú tạm thời";
      default:
        return "🛡️ Trú ẩn an toàn & hỗ trợ y tế";
    }
  };

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      className={`mb-3.5 rounded-2xl bg-surface p-4 border border-outline/15 shadow-sm active:opacity-85 ${className}`}
    >
      {/* Header: Safe Icon + Title + Operating Badge */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Icon Badge */}
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-success/10 border border-success/25">
            {iconDetails?.iconUrl ? (
              <Image
                source={iconDetails.iconUrl}
                className="h-7 w-7"
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={theme.colors.success}
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
                  name="shield-checkmark-outline"
                  size={12}
                  color={theme.colors.success}
                />
                <Text className="ml-1 text-xs font-semibold text-success">
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

        {/* Operating Status Badge */}
        <View
          className={`rounded-full px-2.5 py-1 border ${isActive
            ? "bg-success/10 border-success/30"
            : "bg-surfaceVariant border-outline/20"
            }`}
        >
          <Text
            className={`text-[10px] font-bold ${isActive ? "text-success" : "text-text-muted"
              }`}
          >
            {isActive ? "Đang tiếp nhận" : "Tạm ngưng"}
          </Text>
        </View>
      </View>

      {/* Facilities / Services Tag */}
      <View className="mt-3 flex-row items-center rounded-xl bg-success/5 px-3 py-2 border border-success/15">
        <Text
          className="text-[11px] text-text-muted font-medium flex-1"
          numberOfLines={1}
        >
          {getServiceTag(item.subType)}
        </Text>
      </View>

      {/* Bottom Footer */}
      <View className="mt-3 flex-row items-center justify-between border-t border-outline/10 pt-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className={`h-2 w-2 rounded-full mr-1.5 ${isActive ? "bg-success" : "bg-textMuted"
              }`}
          />
          <Text
            className="text-xs text-text-muted font-medium"
            numberOfLines={1}
          >
            {isActive ? "Sẵn sàng đón người dân" : "Hết sức chứa tiếp nhận"}
          </Text>
        </View>

        <Pressable
          hitSlop={6}
          onPress={() => onPress(item.id)}
          className="flex-row items-center rounded-xl bg-success/10 px-3 py-1.5 active:bg-success/20"
        >
          <Text className="text-xs font-bold text-success mr-1">
            Xem địa điểm
          </Text>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={theme.colors.success}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}
