import { emergencyLevelLabel } from "@/constants/mapPointLables";
import type { EmergencyLevel } from "@/types/map";
import React from "react";
import { Text, View } from "react-native";

export interface EmergencyLevelBadgeProps {
  level: EmergencyLevel;
  className?: string;
}

const emergencyLevelBadgeStyles: Record<
  EmergencyLevel,
  { container: string; text: string }
> = {
  LOW: {
    container: "bg-success/15",
    text: "text-success",
  },
  MEDIUM: {
    container: "bg-warning/15",
    text: "text-warning",
  },
  HIGH: {
    container: "bg-danger/15",
    text: "text-danger",
  },
};

export default function EmergencyLevelBadge({
  level,
  className = "",
}: EmergencyLevelBadgeProps) {
  const styleConfig =
    emergencyLevelBadgeStyles[level] || emergencyLevelBadgeStyles.LOW;

  return (
    <View
      className={`self-end flex-row items-center rounded-full px-2 py-0.5 ${styleConfig.container} ${className}`}
    >
      <Text className={`text-xs font-bold ${styleConfig.text}`}>
        {emergencyLevelLabel[level] || level}
      </Text>
    </View>
  );
}
