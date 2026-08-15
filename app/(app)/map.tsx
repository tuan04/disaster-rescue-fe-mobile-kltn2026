import ScreenContainer from "@/components/common/ScreenContainer";
import { useLocation } from "@/hooks/useLocation";
import React from "react";
import MapView, { Marker } from "react-native-maps";
import { useTheme } from "react-native-paper";
export default function MapScreen() {
  const theme = useTheme();
  const { coords, permissionDenied, loading } = useLocation();
  return (
    <ScreenContainer isEdgeToEdge={true}>
      <MapView
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        style={{ height: "100%", width: "100%" }}
      >
        <Marker
          coordinate={{
            latitude: coords.latitude,
            longitude: coords.longitude,
          }}
          title={permissionDenied ? "Vị trí mặc định" : "Vị trí của bạn"}
        />
      </MapView>
    </ScreenContainer>
  );
}
