import CheckboxOption from "@/components/common/CheckboxOption";
import FieldGroup from "@/components/common/FieldGroup";
import { FilterBottomSheet } from "@/components/common/FilterBottomSheet";
import FilterIconButton from "@/components/common/FilterIconButton";
import ScreenContainer from "@/components/common/ScreenContainer";
import MapClusterMarker from "@/components/map/MapClusterMarker";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import MapPointMarker from "@/components/map/MapPointMarker";
import {
  emergencyLevelLabel,
  hazardTypeLabel,
  pointTypeLabel,
  rescueStatusLabel,
  safePointTypeLabel,
} from "@/contants/mapPointLables";
import { useLocation } from "@/hooks/useLocation";
import { useMapClusters } from "@/hooks/useMapClusters";
import { getAllMapPoints } from "@/services/map.service";
import type {
  EmergencyLevel,
  HazardType,
  MapPointFilterRequest,
  MapPointRes,
  PointType,
  RequestStatus,
  SafePointType,
} from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { Camera, type CameraRef, Map, Marker } from "@maplibre/maplibre-react-native";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

const TIME_OPTIONS = [
  { hours: 2, label: "Trong 2 giờ qua" },
  { hours: 5, label: "Trong 5 giờ qua" },
  { hours: 12, label: "Trong 12 giờ qua" },
  { hours: 24, label: "Trong 24 giờ qua" },
  { hours: 48, label: "Trong 48 giờ qua" },
  { hours: 72, label: "Trong 72 giờ qua" },
];

const toggleArrayItem = <T,>(
  arr: T[] | undefined,
  item: T,
): T[] | undefined => {
  const current = arr || [];
  if (current.includes(item)) {
    const next = current.filter((x) => x !== item);
    return next.length > 0 ? next : undefined;
  } else {
    return [...current, item];
  }
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const cameraRef = useRef<CameraRef>(null);

  const criteriaSheetRef = useRef<BottomSheetModal>(null);
  const timeSheetRef = useRef<BottomSheetModal>(null);
  const detailSheetRef = useRef<BottomSheetModal>(null);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const { coords, loading: isLocationLoading } = useLocation();

  const [filter, setFilter] = useState<MapPointFilterRequest>({});
  const [selectedHours, setSelectedHours] = useState<number | undefined>(
    undefined,
  );

  const activeFilter = useMemo<MapPointFilterRequest>(() => {
    if (!selectedHours) {
      return filter;
    }
    const fromTime = new Date(
      Date.now() - selectedHours * 60 * 60 * 1000,
    ).toISOString();
    return {
      ...filter,
      fromTime,
    };
  }, [filter, selectedHours]);

  const { data: mapPoints = [], isLoading: isPointsLoading } = useQuery<
    MapPointRes[]
  >({
    queryKey: ["mapPoints", activeFilter],
    queryFn: () => getAllMapPoints(activeFilter),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60 * 5,
  });

  const {
    clustersToRender,
    handleRegionDidChange,
    handleClusterPress,
  } = useMapClusters({ mapPoints, cameraRef });

  const defaultLat = 10.8231;
  const defaultLng = 106.6297;

  const currentLat = coords?.latitude ?? defaultLat;
  const currentLng = coords?.longitude ?? defaultLng;

  const [zoomLevel] = useState<number>(14);

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

  const handleTogglePointType = useCallback((type: PointType) => {
    setFilter((prev) => ({
      ...prev,
      pointTypes: toggleArrayItem(prev.pointTypes, type),
    }));
  }, []);

  const handleToggleRescueStatus = useCallback((status: RequestStatus) => {
    setFilter((prev) => ({
      ...prev,
      rescueStatuses: toggleArrayItem(prev.rescueStatuses, status),
    }));
  }, []);

  const handleToggleEmergencyLevel = useCallback((level: EmergencyLevel) => {
    setFilter((prev) => ({
      ...prev,
      emergencyLevels: toggleArrayItem(prev.emergencyLevels, level),
    }));
  }, []);

  const handleToggleHazardType = useCallback((type: HazardType) => {
    setFilter((prev) => ({
      ...prev,
      hazardTypes: toggleArrayItem(prev.hazardTypes, type),
    }));
  }, []);

  const handleToggleSafePointType = useCallback((type: SafePointType) => {
    setFilter((prev) => ({
      ...prev,
      safePointTypes: toggleArrayItem(prev.safePointTypes, type),
    }));
  }, []);

  const handleClearCriteriaFilter = useCallback(() => {
    setFilter((prev) => ({
      ...prev,
      pointTypes: undefined,
      rescueStatuses: undefined,
      emergencyLevels: undefined,
      hazardTypes: undefined,
      safePointTypes: undefined,
    }));
  }, []);

  const handleClearTimeFilter = useCallback(() => {
    setSelectedHours(undefined);
  }, []);

  const activeCriteriaCount = useMemo(
    () =>
      (filter.pointTypes?.length || 0) +
      (filter.rescueStatuses?.length || 0) +
      (filter.emergencyLevels?.length || 0) +
      (filter.hazardTypes?.length || 0) +
      (filter.safePointTypes?.length || 0),
    [
      filter.pointTypes,
      filter.rescueStatuses,
      filter.emergencyLevels,
      filter.hazardTypes,
      filter.safePointTypes,
    ],
  );

  const criteriaSections = useMemo(
    (): Array<{
      label: string;
      options: Record<string, string>;
      selected?: string[];
      onToggle: (val: any) => void;
    }> => [
        {
          label: "Loại điểm",
          options: pointTypeLabel,
          selected: filter.pointTypes,
          onToggle: handleTogglePointType,
        },
        {
          label: "Trạng thái cứu hộ",
          options: rescueStatusLabel,
          selected: filter.rescueStatuses,
          onToggle: handleToggleRescueStatus,
        },
        {
          label: "Mức độ khẩn cấp",
          options: emergencyLevelLabel,
          selected: filter.emergencyLevels,
          onToggle: handleToggleEmergencyLevel,
        },
        {
          label: "Loại nguy hiểm",
          options: hazardTypeLabel,
          selected: filter.hazardTypes,
          onToggle: handleToggleHazardType,
        },
        {
          label: "Loại điểm an toàn",
          options: safePointTypeLabel,
          selected: filter.safePointTypes,
          onToggle: handleToggleSafePointType,
        },
      ],
    [
      filter.pointTypes,
      filter.rescueStatuses,
      filter.emergencyLevels,
      filter.hazardTypes,
      filter.safePointTypes,
      handleTogglePointType,
      handleToggleRescueStatus,
      handleToggleEmergencyLevel,
      handleToggleHazardType,
      handleToggleSafePointType,
    ],
  );

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
