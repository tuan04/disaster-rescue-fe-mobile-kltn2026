import { Marker } from "@maplibre/maplibre-react-native";
import React from "react";
import { Image, View } from "react-native";

const vehicleIcon = require("@/assets/map-icons/sos_transportation.png");

interface RescueTeamMarkerProps {
  id?: string;
  latitude: number;
  longitude: number;
  heading?: number;
  teamName?: string;
  speed?: number;
}

export default function RescueTeamMarker({
  id = "rescue-team-live-marker",
  latitude,
  longitude,
  heading = 0,
}: RescueTeamMarkerProps) {
  const rotation = Math.round(((heading || 0) + 240) % 360);

  return (
    <Marker id={id} lngLat={[longitude, latitude]} anchor="center">
      <View className="items-center justify-center">
        {/* Khối biểu tượng phương tiện cứu hộ */}
        <View className="w-[42px] h-[42px] items-center justify-center">
          {/* Vòng nền đổ bóng định vị tâm xe trên bản đồ */}
          <Image
            source={vehicleIcon}
            className="w-12 h-12"
            style={{ transform: [{ rotate: `${rotation}deg` }] }}
            resizeMode="contain"
          />
        </View>
      </View>
    </Marker>
  );
}
