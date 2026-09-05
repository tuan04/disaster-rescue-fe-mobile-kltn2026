import { formatDateTime } from "@/helper/date";
import type { NotificationItem as NotificationItemType } from "@/types/notification";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface TypeVisualConfig {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  badgeLabel: string;
  badgeClass: string;
}

const TYPE_CONFIGS: Record<string, TypeVisualConfig> = {
  SOS: {
    iconName: "alert-circle",
    iconColor: "#dc2626", // Đỏ
    iconBg: "bg-red-500/10 border-red-500/20",
    badgeLabel: "Cứu hộ",
    badgeClass: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  SOS_ALERT: {
    iconName: "alert-circle",
    iconColor: "#dc2626",
    iconBg: "bg-red-500/10 border-red-500/20",
    badgeLabel: "Cứu hộ",
    badgeClass: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  SAFE_ZONE: {
    iconName: "shield-checkmark",
    iconColor: "#16a34a", // Xanh lá
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    badgeLabel: "Vùng an toàn",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  HAZARD: {
    iconName: "flame",
    iconColor: "#ea580c", // Cam
    iconBg: "bg-orange-500/10 border-orange-500/20",
    badgeLabel: "Vùng nguy hiểm",
    badgeClass: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  },
  WARE_HOUSE: {
    iconName: "business",
    iconColor: "#0284c7", // Xanh dương
    iconBg: "bg-blue-500/10 border-blue-500/20",
    badgeLabel: "Kho cứu trợ",
    badgeClass: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
};

const DEFAULT_CONFIG: TypeVisualConfig = {
  iconName: "notifications",
  iconColor: "#64748b",
  iconBg: "bg-slate-500/10 border-slate-500/20",
  badgeLabel: "Thông báo",
  badgeClass: "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

interface NotificationItemProps {
  notification: NotificationItemType;
  onDelete: (id: string) => void;
  onPress?: (notification: NotificationItemType) => void;
}

export default function NotificationItem({
  notification,
  onDelete,
  onPress,
}: NotificationItemProps) {
  const { id, type, content, isRead, createdAt } = notification;
  const config = TYPE_CONFIGS[type] || DEFAULT_CONFIG;

  return (
    <Pressable
      onPress={() => onPress?.(notification)}
      className={`relative mb-2 flex-row items-center rounded-xl py-2.5 px-3 border transition-all active:opacity-85 shadow-sm ${
        !isRead
          ? "bg-blue-50/70 dark:bg-sky-950/30 border-blue-200/80 dark:border-sky-800/60 shadow-blue-100/50"
          : "bg-surface border-slate-100 dark:border-slate-800/80"
      }`}
    >
      {/* Cột Icon phân loại căn giữa */}
      <View className="mr-2.5 items-center justify-center">
        <View
          className={`h-8 w-8 items-center justify-center rounded-lg border ${config.iconBg}`}
        >
          <Ionicons name={config.iconName} size={17} color={config.iconColor} />
        </View>
      </View>

      {/* Nội dung thông báo */}
      <View className="flex-1 pr-5 justify-center">
        {/* Badge phân loại */}
        <View className="flex-row items-center mb-0.5">
          <View className={`rounded px-1.5 py-0.5 border ${config.badgeClass}`}>
            <Text
              className={`text-[9px] font-bold uppercase tracking-wider ${
                type === "SOS" || type === "SOS_ALERT"
                  ? "text-red-600 dark:text-red-400"
                  : type === "SAFE_ZONE"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : type === "HAZARD"
                  ? "text-orange-600 dark:text-orange-400"
                  : type === "WARE_HOUSE"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              {config.badgeLabel}
            </Text>
          </View>
        </View>

        {/* Nội dung Content (chữ nhỏ, tối đa 2 dòng kèm dấu ...) */}
        <Text
          numberOfLines={2}
          ellipsizeMode="tail"
          className={`text-xs leading-4 mb-0.5 ${
            !isRead
              ? "font-semibold text-slate-900 dark:text-white"
              : "font-normal text-slate-600 dark:text-slate-300"
          }`}
        >
          {content}
        </Text>

        {/* Thời gian: HH:mm - DD/MM/YYYY */}
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={10} color="#94a3b8" />
          <Text className="ml-1 text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {formatDateTime(createdAt)}
          </Text>
        </View>
      </View>

      {/* Nút Xóa ở góc trên bên phải (Icon 'X') */}
      <Pressable
        hitSlop={8}
        onPress={() => onDelete(id)}
        className="absolute top-2 right-2 h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:bg-red-50 dark:active:bg-red-950/40"
      >
        <Ionicons name="close" size={13} color="#94a3b8" />
      </Pressable>
    </Pressable>
  );
}