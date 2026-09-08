import { Marker } from "@maplibre/maplibre-react-native";
import React from "react";
import { Image, View } from "react-native";

interface UserLocationMarkerProps {
  id?: string;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number;
  mapBearing?: number;
  permissionDenied?: boolean;
  showHeadingCone?: boolean;
  coneSize?: number;
  dotSize?: number;
}

export default function UserLocationMarker({
  id = "user-location",
  latitude,
  longitude,
  heading = 0,
  mapBearing = 0,
  permissionDenied = false,
  showHeadingCone = true,
  coneSize = 80,
  dotSize = 18,
}: UserLocationMarkerProps) {
  if (permissionDenied || !latitude || !longitude) {
    return null;
  }

  const effectiveHeading = Math.round((heading - mapBearing + 360) % 360);

  return (
    <Marker id={id} lngLat={[longitude, latitude]} anchor="center">
      <View
        style={{
          width: coneSize,
          height: coneSize,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Vệt sáng hình cánh quạt */}
        {showHeadingCone && (
          <View
            style={{
              position: "absolute",
              width: coneSize,
              height: coneSize,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ rotate: `${effectiveHeading}deg` }],
            }}
          >
            <Image
              source={require("@/assets/images/user-heading-cone.png")}
              style={{ width: coneSize, height: coneSize }}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Chấm tròn định vị */}
        <View
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: "#1d4ed8",
            borderWidth: 2,
            borderColor: "#ffffff",
            shadowColor: "#1d4ed8",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.85,
            shadowRadius: 6,
            elevation: 6,
          }}
        />
      </View>
    </Marker>
  );
}
