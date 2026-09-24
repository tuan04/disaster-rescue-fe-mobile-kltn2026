import { useAppTheme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export default function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = "Tìm kiếm...",
  isLoading = false,
  className = "",
  style,
}: SearchBarProps) {
  const theme = useAppTheme();

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChangeText("");
    }
  };

  return (
    <View
      style={style}
      className={`relative flex-row items-center rounded-xl border border-gray-200 bg-white px-3 py-0.5 shadow-xs dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <Ionicons name="search" size={18} color="#94a3b8" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        className="flex-1 px-2 py-2 text-sm text-text"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {isLoading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : value.length > 0 ? (
        <Pressable
          onPress={handleClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="active:opacity-70"
        >
          <Ionicons name="close-circle" size={18} color="#94a3b8" />
        </Pressable>
      ) : null}
    </View>
  );
}
