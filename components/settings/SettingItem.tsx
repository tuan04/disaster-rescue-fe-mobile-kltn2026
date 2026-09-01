import { ColorTokens } from "@/contants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";

export type SettingItemType = "link" | "switch" | "info";

export interface SettingItemProps {
  /** Tên icon từ @expo/vector-icons (Ionicons) */
  iconName: keyof typeof Ionicons.glyphMap;
  /** Mã màu cho icon */
  iconColor?: string;
  /** Tiêu đề của cài đặt */
  title: string;
  /** Loại component: 'link' (mũi tên), 'switch' (công tắc), 'info' (thông tin text) */
  type: SettingItemType;
  /** Giá trị boolean (cho switch) hoặc string (cho info/badge) */
  value?: boolean | string;
  /** Hàm callback khi click hoặc thay đổi switch */
  onPress?: (value?: boolean) => void;
  /** Mô tả phụ (nếu có) */
  subtitle?: string;
  /** Ẩn đường kẻ phân cách nếu là phần tử cuối trong section */
  isLast?: boolean;
  /** Vô hiệu hóa tương tác */
  disabled?: boolean;
}

export default function SettingItem({
  iconName,
  iconColor,
  title,
  type,
  value,
  onPress,
  subtitle,
  isLast = false,
  disabled = false,
}: SettingItemProps) {
  const theme = useTheme();
  const effectiveIconColor =
    iconColor || theme.colors.primary || ColorTokens.light.primary;

  const handlePress = () => {
    if (disabled) return;
    if (type === "switch") {
      onPress?.(!value);
    } else {
      onPress?.();
    }
  };

  const renderRightContent = () => {
    switch (type) {
      case "link":
        return (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.outline || ColorTokens.light.textMuted}
          />
        );
      case "switch":
        return (
          <Switch
            value={Boolean(value)}
            onValueChange={(val) => onPress?.(val)}
            trackColor={{
              false: "#cbd5e1",
              true: theme.colors.primary || ColorTokens.light.primary,
            }}
            thumbColor="#ffffff"
            ios_backgroundColor="#e2e8f0"
            disabled={disabled}
          />
        );
      case "info":
        return (
          <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {String(value ?? "")}
          </Text>
        );
      default:
        return null;
    }
  };

  return (
    <View className="bg-surface">
      <TouchableOpacity
        activeOpacity={type === "switch" ? 0.9 : 0.6}
        onPress={handlePress}
        disabled={disabled || (type === "info" && !onPress)}
        className="flex-row items-center justify-between px-4 py-3.5"
      >
        {/* Left: Icon & Title */}
        <View className="flex-row items-center flex-1 mr-3">
          <View
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: `${effectiveIconColor}18` }}
          >
            <Ionicons name={iconName} size={20} color={effectiveIconColor} />
          </View>

          <View className="flex-1 ml-3.5">
            <Text
              className="text-[15px] font-semibold text-slate-800 dark:text-slate-100"
              numberOfLines={1}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right: Action / Content */}
        <View className="items-end justify-center">
          {renderRightContent()}
        </View>
      </TouchableOpacity>

      {/* Divider */}
      {!isLast && (
        <View className="h-[1px] bg-slate-100 dark:bg-slate-800 ml-14 mr-4" />
      )}
    </View>
  );
}
