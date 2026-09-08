import CheckboxOption from "@/components/common/CheckboxOption";
import FieldGroup from "@/components/common/FieldGroup";
import { FilterBottomSheet } from "@/components/common/FilterBottomSheet";
import FilterIconButton from "@/components/common/FilterIconButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import MapClusterMarker from "@/components/map/MapClusterMarker";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import MapPointMarker from "@/components/map/MapPointMarker";
import UserLocationMarker from "@/components/map/UserLocationMarker";
import { MAP_STYLE_URL, TIME_OPTIONS } from "@/contants/mapConfig";
import { useLocation } from "@/hooks/useLocation";
import { useMapClustering } from "@/hooks/useMapClustering";
import { useMapPoints } from "@/hooks/useMapPoints";
import { useRescue } from "@/hooks/useRescue";
import type { MapPointRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  Camera,
  type CameraRef,
  Map,
} from "@maplibre/maplibre-react-native";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
    heading,
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

  const { handleRescue, isAccepting } = useRescue({
    isRealLocation,
    permissionDenied,
    refreshLocation,
    currentLat,
    currentLng,
    detailSheetRef,
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
        attribution={false}
        logo={false}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [currentLng, currentLat],
            zoom: zoomLevel,
          }}
        />
        <UserLocationMarker
          latitude={currentLat}
          longitude={currentLng}
          heading={heading}
          permissionDenied={permissionDenied}
        />

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
        style={{ bottom: 24 }}
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
    </ScreenContainer>
  );
}
