import { Spacing, useAppTheme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  left?: React.ReactNode;
  middle?: React.ReactNode;
  right?: React.ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
  titleClassName?: string;
  subtitleClassName?: string;
}

export default function Header({
  title,
  subtitle,
  left,
  middle,
  right,
  showBackButton = true,
  onBackPress,
  className = "",
  style,
  titleClassName = "",
  subtitleClassName = "",
}: HeaderProps) {
  const theme = useAppTheme();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.primary,
          paddingHorizontal: Spacing.screenHorizontal,
          paddingVertical: Spacing.sm,
        },
        style,
      ]}
      className={`flex-row items-center justify-between shadow-xs ${className}`}
    >
      {/* 1. Phần Left */}
      <View className="flex-row items-center">
        {left !== undefined ? (
          left
        ) : showBackButton ? (
          <Pressable
            onPress={handleBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white/20 active:opacity-70"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </Pressable>
        ) : null}
      </View>

      {/* 2. Phần Middle */}
      <View className="flex-1 justify-center px-1">
        {middle !== undefined ? (
          middle
        ) : (
          <View>
            {title ? (
              <Text
                className={`text-lg font-bold text-white ${titleClassName}`}
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                className={`text-xs font-medium text-white/85 mt-0.5 ${subtitleClassName}`}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {/* 3. Phần Right */}
      <View className="flex-row items-center">
        {right !== undefined ? right : null}
      </View>
    </View>
  );
}
