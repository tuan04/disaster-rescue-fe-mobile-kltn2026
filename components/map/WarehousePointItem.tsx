import { getWarehouseIconDetails } from "@/contants/mapPointMeta";
import { useAppTheme } from "@/contants/theme";
import { formatDistance } from "@/helpers/route";
import type { WarehouseMapPointRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

export interface WarehousePointItemProps {
  item: WarehouseMapPointRes & { distanceKm?: number };
  onPress: (id: string) => void;
  className?: string;
}

export default function WarehousePointItem({
  item,
  onPress,
  className = "",
}: WarehousePointItemProps) {
  const theme = useAppTheme();
  const distance = formatDistance(item.distanceKm);

  const iconDetails = getWarehouseIconDetails();
  const isActive = item.status !== "INACTIVE";

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      className={`mb-3.5 rounded-2xl bg-surface p-4 border border-outline/15 shadow-sm active:opacity-85 ${className}`}
    >
      {/* Header: Warehouse Icon + Title + Operational Badge */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          {/* Icon Badge */}
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 border border-secondary/25">
            {iconDetails?.iconUrl ? (
              <Image
                source={iconDetails.iconUrl}
                className="h-7 w-7"
                resizeMode="contain"
              />
            ) : (
              <Ionicons
                name="business"
                size={24}
                color={theme.colors.secondary}
              />
            )}
          </View>

          {/* Title & Distance */}
          <View className="flex-1 justify-center">
            <Text
              className="text-base font-bold text-text mb-0.5"
              numberOfLines={1}
            >
              {item.subType || "Kho tiếp tế nhu yếu phẩm"}
            </Text>

            {distance ? (
              <View className="flex-row items-center">
                <Ionicons
                  name="cube-outline"
                  size={12}
                  color={theme.colors.secondary}
                />
                <Text className="ml-1 text-xs font-semibold text-secondary">
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

        {/* Operational Status Badge */}
        <View
          className={`rounded-full px-2.5 py-1 border ${isActive
            ? "bg-secondary/10 border-secondary/30"
            : "bg-surfaceVariant border-outline/20"
            }`}
        >
          <Text
            className={`text-[10px] font-bold ${isActive ? "text-secondary" : "text-text-muted"
              }`}
          >
            {isActive ? "Đang mở cửa" : "Tạm đóng"}
          </Text>
        </View>
      </View>

      {/* Supplies Highlight Strip */}
      <View className="mt-3 flex-row items-center rounded-xl bg-secondary/5 px-3 py-2 border border-secondary/15">
        <Ionicons
          name="cube"
          size={13}
          color={theme.colors.secondary}
        />
        <Text
          className="ml-1.5 text-[11px] text-text-muted font-medium flex-1"
          numberOfLines={1}
        >
          Áo phao • Lương thực khô • Nước sạch • Thuốc men & Dụng cụ y tế
        </Text>
      </View>

      {/* Bottom Footer */}
      <View className="mt-3 flex-row items-center justify-between border-t border-outline/10 pt-3">
        <View className="flex-row items-center flex-1 mr-2">
          <View
            className={`h-2 w-2 rounded-full mr-1.5 ${isActive ? "bg-secondary" : "bg-textMuted"
              }`}
          />
          <Text
            className="text-xs text-text-muted font-medium"
            numberOfLines={1}
          >
            {isActive ? "Điểm tiếp nhận & phân phát" : "Tạm dừng phát nhu yếu phẩm"}
          </Text>
        </View>

        <Pressable
          hitSlop={6}
          onPress={() => onPress(item.id)}
          className="flex-row items-center rounded-xl bg-secondary/10 px-3 py-1.5 active:bg-secondary/20"
        >
          <Text className="text-xs font-bold text-secondary mr-1">
            Chi tiết kho
          </Text>
          <Ionicons
            name="chevron-forward"
            size={13}
            color={theme.colors.secondary}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}
