import { useAppTheme } from "@/contants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface CheckboxOptionProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  subtitle?: string;
  disabled?: boolean;
}

function CheckboxOption({
  label,
  checked,
  onToggle,
  subtitle,
  disabled = false,
}: CheckboxOptionProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      className={`flex-row items-center rounded-lg p-1.5 ${
        disabled ? "opacity-40" : "active:opacity-70"
      }`}
      android_ripple={{ color: theme.colors.primary + "1A" }}
    >
      <View className="mr-2.5 items-center justify-center">
        <MaterialCommunityIcons
          name={checked ? "checkbox-marked" : "checkbox-blank-outline"}
          size={24}
          color={checked ? theme.colors.primary : theme.colors.outline}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base ${
            checked
              ? "font-semibold text-gray-900 dark:text-white"
              : "font-normal text-gray-700 dark:text-gray-200"
          }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default React.memo(CheckboxOption);
