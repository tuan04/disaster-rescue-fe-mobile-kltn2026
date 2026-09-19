import { Ionicons } from "@expo/vector-icons";
import { Marker } from "@maplibre/maplibre-react-native";
import React from "react";
import { Text, View } from "react-native";

export interface TargetPointMarkerProps {
  id?: string;
  latitude: number;
  longitude: number;
  label?: string;
  labelClassName?: string;
  pinColor?: string;
}

export default function TargetPointMarker({
  id = "target-point-marker",
  latitude,
  longitude,
  label,
  labelClassName,
  pinColor = "#ef4444",
}: TargetPointMarkerProps) {
  return (
    <Marker id={id} lngLat={[longitude, latitude]} anchor="bottom">
      <View className="items-center justify-center">
        {/* Nhãn hiển thị vị trí / tên điểm đến */}
        {label ? (
          <View className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-2xl mb-1 shadow-md border border-slate-200 dark:border-slate-700 elevation-5 max-w-[180px]">
            <Text
              className={
                labelClassName ||
                "text-[11px] font-extrabold text-red-600 dark:text-red-400"
              }
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        ) : null}

        {/* Pin ghim vị trí */}
        <View className="items-center justify-center shadow-lg elevation-6">
          <Ionicons name="location" size={38} color={pinColor} />
          <View className="absolute top-[9px] w-2.5 h-2.5 rounded-full bg-white" />
        </View>
      </View>
    </Marker>
  );
}
