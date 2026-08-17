import ScreenContainer from "@/components/common/ScreenContainer";
import SosMarker from "@/components/map/SosMarker";
import { useLocation } from "@/hooks/useLocation";
import { MOCK_POINTS } from "@/mocks/map";
import { PointType } from "@/types/map";
import React, { useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { ActivityIndicator, useTheme } from "react-native-paper";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function MapScreen() {
  const { coords, permissionDenied, loading } = useLocation();
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  const regionRef = useRef<Region>({
    latitude: coords?.latitude ?? 10.8231,
    longitude: coords?.longitude ?? 106.6297,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const points = MOCK_POINTS;

  if (loading) {
    return (
      <ScreenContainer style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ScreenContainer>
    );
  }

  const handleZoomIn = () => {
    if (!mapRef.current) return;
    const currentRegion = regionRef.current;
    const newRegion = {
      ...currentRegion,
      latitudeDelta: currentRegion.latitudeDelta / 2,
      longitudeDelta: currentRegion.longitudeDelta / 2,
    };
    regionRef.current = newRegion;
    mapRef.current.animateToRegion(newRegion, 300);
  };

  const handleZoomOut = () => {
    if (!mapRef.current) return;
    const currentRegion = regionRef.current;
    const newRegion = {
      ...currentRegion,
      latitudeDelta: Math.min(currentRegion.latitudeDelta * 2, 180),
      longitudeDelta: Math.min(currentRegion.longitudeDelta * 2, 180),
    };
    regionRef.current = newRegion;
    mapRef.current.animateToRegion(newRegion, 300);
  };

  return (
    <ScreenContainer isEdgeToEdge={true}>
      <MapView
        ref={mapRef}
        showsPointsOfInterest={false}
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onRegionChangeComplete={(newRegion) => {
          regionRef.current = newRegion;
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

        {/* SOS Markers */}
        {points
          .filter((p) => p.pointType === PointType.SOS)
          .map((point) => (
            <SosMarker key={point.id} point={point} />
          ))}
      </MapView>

      {/* Zoom In/Out Buttons */}
      <View style={styles.zoomContainer}>
        <TouchableOpacity
          style={[styles.zoomButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleZoomIn}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.zoomButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleZoomOut}
          activeOpacity={0.7}
        >
          <Ionicons name="remove" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  zoomContainer: {
    position: "absolute",
    bottom: 24,
    right: 14,
    flexDirection: "column",
  },
  zoomButton: {
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Elevation for Android
    elevation: 5,
  },
});
