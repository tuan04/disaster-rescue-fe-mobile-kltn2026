import ScreenContainer from "@/components/common/ScreenContainer";
import MapMarker from "@/components/map/MapMarker";
import { useLocation } from "@/hooks/useLocation";
import { getMapPoints } from "@/services/map";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { ActivityIndicator } from "react-native-paper";

export default function MapScreen() {
  const { coords, permissionDenied, loading } = useLocation();

  // Fetch map points using TanStack React Query
  const { data: points = [], isLoading: fetching, error } = useQuery({
    queryKey: ["mapPoints"],
    queryFn: getMapPoints,
  });

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer isEdgeToEdge={true}>
      <MapView
        showsPointsOfInterest={false}
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        style={{ height: "100%", width: "100%" }}
      >
        {/* User's current location pin */}
        <Marker
          coordinate={{
            latitude: coords.latitude,
            longitude: coords.longitude,
          }}
          title={permissionDenied ? "Vị trí mặc định" : "Vị trí của bạn"}
        />

        {points.map((point) => (
          <MapMarker
            key={point.id}
            point={point}
            userRole="citizen"
          />
        ))}
      </MapView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
