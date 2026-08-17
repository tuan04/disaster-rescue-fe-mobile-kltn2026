import { MapPointRes } from "@/types/map";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";
import { useTheme } from "react-native-paper";

interface SosMarkerProps {
  point: MapPointRes;
}

export default function SosMarker({ point }: SosMarkerProps) {
  const theme = useTheme() as any;
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const dangerColor = theme.colors.danger;
  const successColor = theme.colors.success;

  const isCompleted = point.status === "COMPLETED";
  const markerSize = isCompleted ? 32 : 40;
  const borderRadius = markerSize / 2;

  let markerColor = dangerColor;

  if (point.status === "PENDING") {
    markerColor = dangerColor;
  } else if (point.status === "ACCEPTED") {
    markerColor = dangerColor;
  } else if (point.status === "COMPLETED") {
    markerColor = successColor;
  }

  // Optimize performance: allow rendering for a brief moment, then freeze the marker image
  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 800); // 800ms is more than enough for a simple circle view to render

    return () => clearTimeout(timer);
  }, [point.status, point.latitude, point.longitude]);

  return (
    <Marker
      coordinate={{
        latitude: point.latitude,
        longitude: point.longitude,
      }}
      title={`CỨU HỘ KHẨN CẤP`}
      description={`Trạng thái: ${point.status}`}
      tracksViewChanges={tracksViewChanges} // Dynamic tracking to save CPU and battery
      anchor={{ x: 0.5, y: 0.5 }} // Center the marker on coordinates
    >
      <View
        style={[
          styles.sosMarker,
          {
            backgroundColor: markerColor,
            width: markerSize,
            height: markerSize,
            borderRadius: borderRadius,
            borderWidth: 4,
          },
        ]}
      />
    </Marker>
  );
}

const styles = StyleSheet.create({
  sosMarker: {
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
});
