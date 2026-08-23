import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "react-native-paper";

export interface FilterIconButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  count?: number;
  active?: boolean;
}

export default function FilterIconButton({
  iconName,
  onPress,
  count = 0,
}: FilterIconButtonProps) {
  const theme = useTheme();

  return (
    <View className="relative">
      <Pressable
        onPress={onPress}
        className="w-11 h-11 rounded-md items-center justify-center shadow-md elevation-4 active:opacity-70"
        style={{
          backgroundColor: theme.colors.secondary || "#10b4c0",
        }}
      >
        <Ionicons name={iconName} size={20} color="#FFFFFF" />
      </Pressable>

      {count > 0 && (
        <View
          className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full items-center justify-center border-2 border-white shadow-sm elevation-2"
          style={{ backgroundColor: theme.colors.error || "#D9383A" }}
          pointerEvents="none"
        >
          <Text className="text-white text-[10px] font-extrabold text-center leading-none">
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </View>
  );
}
