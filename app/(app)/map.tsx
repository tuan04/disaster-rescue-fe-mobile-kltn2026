import CheckboxOption from "@/components/common/CheckboxOption";
import FieldGroup from "@/components/common/FieldGroup";
import { FilterBottomSheet } from "@/components/common/FilterBottomSheet";
import FilterIconButton from "@/components/common/FilterIconButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import MapClusterMarker from "@/components/map/MapClusterMarker";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import MapPointMarker from "@/components/map/MapPointMarker";
import { MAP_STYLE_URL, TIME_OPTIONS } from "@/contants/mapConfig";
import { useLocation } from "@/hooks/useLocation";
import { useMapClustering } from "@/hooks/useMapClustering";
import { useMapPoints } from "@/hooks/useMapPoints";
import { useRescue } from "@/hooks/useRescue";
import { useRoute } from "@/hooks/useRoute";
import type { MapPointRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
} from "@maplibre/maplibre-react-native";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const cameraRef = useRef<CameraRef>(null);

  const criteriaSheetRef = useRef<BottomSheetModal>(null);
  const timeSheetRef = useRef<BottomSheetModal>(null);
  const detailSheetRef = useRef<BottomSheetModal>(null);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [zoomLevel] = useState<number>(14);

  // User location hook
  const {
    coords,
    loading: isLocationLoading,
    isRealLocation,
    permissionDenied,
    refresh: refreshLocation,
  } = useLocation();

  const currentLat = coords.latitude;
  const currentLng = coords.longitude;

  // Custom Hooks
  const {
    mapPoints,
    isPointsLoading,
    selectedHours,
    setSelectedHours,
    activeCriteriaCount,
    criteriaSections,
    handleClearCriteriaFilter,
    handleClearTimeFilter,
  } = useMapPoints();

  const {
    clustersToRender,
    handleRegionDidChange,
    handleClusterPress,
  } = useMapClustering({ mapPoints, cameraRef });

  const {
    activeRoute,
    routeGeoJSON,
    fetchRoute,
    clearRoute,
  } = useRoute({ cameraRef });

  const { handleRescue, isAccepting } = useRescue({
    isRealLocation,
    permissionDenied,
    refreshLocation,
    currentLat,
    currentLng,
    detailSheetRef,
    onRouteCalculated: fetchRoute,
  });

  const handleFlyToUserLocation = useCallback(() => {
    if (coords && cameraRef.current) {
      cameraRef.current.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 15,
        duration: 1000,
      });
    }
  }, [coords]);

  const handleOpenCriteriaSheet = useCallback(() => {
    criteriaSheetRef.current?.present();
  }, []);

  const handleOpenTimeSheet = useCallback(() => {
    timeSheetRef.current?.present();
  }, []);

  const handleMarkerPress = useCallback((point: MapPointRes) => {
    setSelectedPointId(point.id);
    detailSheetRef.current?.present();
  }, []);

  if (isLocationLoading) {
    return (
      <ScreenContainer className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer isEdgeToEdge={true} className="flex-1">
      <Map
        style={StyleSheet.absoluteFillObject}
        mapStyle={MAP_STYLE_URL}
        onRegionDidChange={handleRegionDidChange}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [currentLng, currentLat],
            zoom: zoomLevel,
          }}
        />
        {isRealLocation && (
          <Marker
            id="user-location"
            lngLat={[currentLng, currentLat]}
            anchor="center"
          >
            <View
              className="w-4.5 h-4.5 rounded-full border-2 border-white"
              style={{ backgroundColor: theme.colors.primary }}
            />
          </Marker>
        )}

        {routeGeoJSON && (
          <GeoJSONSource id="routeSource" data={routeGeoJSON}>
            <Layer
              id="routeCasing"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 8,
                "line-opacity": 0.4,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
            <Layer
              id="routeLine"
              type="line"
              paint={{
                "line-color": "#1d4ed8",
                "line-width": 4,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </GeoJSONSource>
        )}

        {clustersToRender.map((item) => {
          if (
            item.isCluster &&
            item.clusterId !== undefined &&
            item.pointCount !== undefined
          ) {
            return (
              <MapClusterMarker
                key={item.id}
                id={item.id}
                pointType={item.pointType}
                count={item.pointCount}
                coordinates={item.coordinates}
                onPress={() =>
                  handleClusterPress(
                    item.pointType,
                    item.clusterId!,
                    item.coordinates,
                  )
                }
              />
            );
          }

          if (item.point) {
            return (
              <MapPointMarker
                key={item.id}
                point={item.point}
                onPress={handleMarkerPress}
              />
            );
          }

          return null;
        })}
      </Map>

      <View
        className="absolute right-4 flex-col gap-2.5 z-10"
        style={{ top: insets.top + 10 }}
      >
        <FilterIconButton
          iconName="funnel"
          onPress={handleOpenCriteriaSheet}
          count={activeCriteriaCount}
        />
        <FilterIconButton
          iconName="time"
          onPress={handleOpenTimeSheet}
          count={selectedHours ? 1 : 0}
        />
      </View>

      <Pressable
        onPress={handleFlyToUserLocation}
        className="absolute right-4 bg-white dark:bg-slate-800 w-12 h-12 rounded-full items-center justify-center shadow-lg elevation-5 active:opacity-70 z-10"
        style={{ bottom: activeRoute ? insets.bottom + 104 : 24 }}
      >
        <Ionicons name="locate" size={22} color={theme.colors.primary} />
      </Pressable>

      <FilterBottomSheet
        ref={criteriaSheetRef}
        title="Lọc Tiêu Chí"
        activeCount={activeCriteriaCount}
        onClear={handleClearCriteriaFilter}
        snapPoints={["65%", "90%"]}
      >
        {criteriaSections.map((section) => (
          <FieldGroup
            key={section.label}
            label={section.label}
            labelStyle={{ color: theme.colors.primary }}
            className="flex-col gap-1"
            fields={Object.entries(section.options).map(([key, label]) => (
              <CheckboxOption
                key={key}
                label={label}
                checked={section.selected?.includes(key) ?? false}
                onToggle={() => section.onToggle(key)}
              />
            ))}
          />
        ))}
      </FilterBottomSheet>

      <FilterBottomSheet
        ref={timeSheetRef}
        title="Thời Gian Đăng"
        activeCount={selectedHours ? 1 : 0}
        onClear={handleClearTimeFilter}
        snapPoints={["50%", "75%"]}
      >
        <FieldGroup
          label="Hiển thị thông tin đăng trong"
          labelStyle={{ color: theme.colors.primary }}
          className="flex-col gap-1"
          fields={TIME_OPTIONS.map((opt) => (
            <CheckboxOption
              key={opt.hours}
              label={opt.label}
              checked={selectedHours === opt.hours}
              onToggle={() =>
                setSelectedHours((prev) =>
                  prev === opt.hours ? undefined : opt.hours,
                )
              }
            />
          ))}
        />
      </FilterBottomSheet>

      <MapPointDetailBottomSheet
        ref={detailSheetRef}
        pointId={selectedPointId}
        onDismiss={() => setSelectedPointId(null)}
        onRescue={handleRescue}
        isAccepting={isAccepting}
      />

      {isPointsLoading && (
        <View
          className="absolute right-4 bg-white/90 dark:bg-gray-900/90 p-2 rounded-full shadow-md elevation-4"
          style={{ top: insets.top + 120 }}
        >
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      {activeRoute && activeRoute.routes && activeRoute.routes.length > 0 && (
        <View
          className="absolute left-4 right-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 flex-row items-center justify-between z-20"
          style={{ bottom: insets.bottom + 16 }}
        >
          <View className="flex-1 mr-3">
            <Text className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
              Đường đi cứu hộ
            </Text>
            <View className="flex-row items-baseline gap-1.5">
              <Text className="text-xl font-bold text-slate-900 dark:text-white">
                {(activeRoute.routes[0].distance / 1000).toFixed(1)} km
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                ({Math.round(activeRoute.routes[0].duration / 60)} phút)
              </Text>
            </View>
          </View>
          <Pressable
            onPress={clearRoute}
            className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 active:opacity-80"
          >
            <Text className="text-red-500 dark:text-red-400 font-bold text-sm">
              Hủy dẫn đường
            </Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}
