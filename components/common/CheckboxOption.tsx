import React from "react";
import { Pressable, Text, View } from "react-native";
import { Checkbox, useTheme } from "react-native-paper";

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
  const theme = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      className={`flex-row items-center rounded-lg ${disabled ? "opacity-40" : "active:opacity-70"
        }`}
      android_ripple={{ color: theme.colors.primary + "1A" }}
    >
      <View className="mr-2">
        <Checkbox.Android
          status={checked ? "checked" : "unchecked"}
          onPress={onToggle}
          disabled={disabled}
          color={theme.colors.primary}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base ${checked
              ? "font-semibold text-gray-900 dark:text-white"
              : "font-normal text-gray-700 dark:text-gray-200"
            }`}
        >
          {label}
        </Text>
        {subtitle && (
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default React.memo(CheckboxOption);
