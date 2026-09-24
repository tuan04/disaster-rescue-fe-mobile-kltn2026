import EmergencyLevelBadge from "@/components/common/EmergencyLevelBadge";
import { useAppTheme } from "@/constants/theme";
import { formatDistance } from "@/helpers/route";
import type { MapPointDetailRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export interface PendingAssignmentCardProps {
  item: MapPointDetailRes & { distanceKm?: number };
  onPress: (item: MapPointDetailRes) => void;
  onCall: (phone?: string) => void;
  onRescue?: (item: MapPointDetailRes) => void;
  onReject?: (item: MapPointDetailRes) => void;
  isRescuing?: boolean;
  className?: string;
}

const PendingAssignmentCard = React.memo(
  ({
    item,
    onPress,
    onCall,
    onRescue,
    onReject,
    isRescuing = false,
    className = "",
  }: PendingAssignmentCardProps) => {
    const theme = useAppTheme();
    const distance = formatDistance(item.distanceKm);
    const emergencyLevel =
      item.pointType === "SOS" ? item.detail.emergencyLevel : "MEDIUM";
    const phone =
      item.pointType === "SOS" ? item.detail.reporterPhone : undefined;

    return (
      <Pressable
        onPress={() => onPress(item)}
        className={`mb-3.5 rounded-2xl bg-surface p-4 shadow-sm border border-slate-100 dark:border-slate-800 active:opacity-95 ${className}`}
      >
        {/* 1. Mức độ khẩn cấp & Khoảng cách */}
        <View className="flex-row items-center justify-between">
          <EmergencyLevelBadge level={emergencyLevel} />

          <View className="flex-row items-center bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-full">
            <Ionicons
              name="navigate"
              size={12}
              color={theme.colors.primary}
            />
            <Text className="ml-1 text-xs font-bold text-primary">
              {distance ? `Cách bạn ${distance}` : "Chưa có vị trí"}
            </Text>
          </View>
        </View>

        {/* 2. Số điện thoại */}
        <View className="mt-3 flex-row items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="h-8 w-8 rounded-full bg-slate-200/80 dark:bg-slate-700 items-center justify-center mr-2.5">
              <Ionicons
                name="call"
                size={14}
                color={theme.colors.primary}
              />
            </View>
            <View>
              <Text className="text-[10px] font-medium text-textMuted uppercase tracking-wider">
                Số điện thoại
              </Text>
              <Text className="text-sm font-bold text-text">
                {phone || "Chưa cập nhật"}
              </Text>
            </View>
          </View>

          {phone ? (
            <Pressable
              onPress={() => onCall(phone)}
              hitSlop={8}
              className="flex-row items-center rounded-full bg-emerald-500/15 px-3 py-1.5 border border-emerald-500/30 active:bg-emerald-500/25"
            >
              <Ionicons name="call" size={12} color="#059669" />
              <Text className="ml-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Gọi
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* 3. Hai nút: Từ chối & Cứu hộ */}
        <View className="mt-3.5 flex-row gap-2.5">
          <Pressable
            onPress={() => onReject?.(item)}
            className="flex-1 flex-row items-center justify-center rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 py-2.5 active:opacity-75"
          >
            <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
            <Text className="ml-1.5 text-xs font-bold text-red-600 dark:text-red-400">
              Từ chối
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onRescue?.(item)}
            disabled={isRescuing}
            className="flex-1 flex-row items-center justify-center rounded-xl bg-primary py-2.5 active:opacity-85 shadow-xs"
          >
            {isRescuing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
                <Text className="ml-1.5 text-xs font-bold text-white">
                  Cứu hộ
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </Pressable>
    );
  },
);

PendingAssignmentCard.displayName = "PendingAssignmentCard";

export default PendingAssignmentCard;
