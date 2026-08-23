import type { UtilityItem } from "@/mock/homeData";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface UtilityCardProps {
  item: UtilityItem;
  onPress?: () => void;
  className?: string;
}

export default function UtilityCard({
  item,
  onPress,
  className = "",
}: UtilityCardProps) {
  return (
    <Pressable
      className={`w-1/4 items-center px-1 py-2 active:opacity-70 ${className}`}
      onPress={onPress}
    >
      <View
        className={`mb-2 h-12 w-12 items-center justify-center rounded-2xl ${item.bgColor}`}
      >
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>
      <Text
        className="text-center text-xs font-medium text-slate-700"
        numberOfLines={2}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}
