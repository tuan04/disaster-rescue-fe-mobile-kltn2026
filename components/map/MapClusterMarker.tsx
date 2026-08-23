import type { PointType } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { Marker } from "@maplibre/maplibre-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export interface MapClusterMarkerProps {
  id: string;
  pointType: PointType;
  count: number;
  coordinates: [number, number];
  onPress?: () => void;
}

const clusterThemeConfig: Record<
  PointType,
  { bg: string; border: string; text: string; iconName: keyof typeof Ionicons.glyphMap }
> = {
  SOS: {
    bg: "bg-red-600",
    border: "border-white",
    text: "text-white",
    iconName: "alert-circle",
  },
  HAZARD: {
    bg: "bg-amber-500",
    border: "border-white",
    text: "text-white",
    iconName: "warning",
  },
  SAFE_ZONE: {
    bg: "bg-emerald-600",
    border: "border-white",
    text: "text-white",
    iconName: "shield-checkmark",
  },
  WARE_HOUSE: {
    bg: "bg-blue-600",
    border: "border-white",
    text: "text-white",
    iconName: "cube",
  },
};

function MapClusterMarker({
  id,
  pointType,
  count,
  coordinates,
  onPress,
}: MapClusterMarkerProps) {
  const config = clusterThemeConfig[pointType] || clusterThemeConfig.SOS;

  return (
    <Marker
      id={id}
      lngLat={coordinates}
      anchor="center"
      onPress={onPress}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        className={`flex-row items-center justify-center rounded-full px-2.5 py-1.5 border-2 shadow-md ${config.bg} ${config.border}`}
        style={styles.container}
      >
        <Ionicons name={config.iconName} size={14} color="#FFFFFF" />
        <Text className={`ml-1 text-xs font-bold ${config.text}`}>
          {count > 99 ? "99+" : count}
        </Text>
      </TouchableOpacity>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    elevation: 5,
    minWidth: 38,
    minHeight: 32,
  },
});

export default React.memo(MapClusterMarker);
