import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import SearchBar from "@/components/common/SearchBar";
import CreateHazardBottomSheet from "@/components/map/CreateHazardBottomSheet";
import HazardPointItem from "@/components/map/HazardPointItem";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import { hazardTypeLabel } from "@/constants/mapPointLables";
import { calculateDistanceKm } from "@/helpers/route";
import { useAppTheme } from "@/constants/theme";
import { useMapPointsQuery } from "@/hooks/queries";
import { useUserCoordinates } from "@/hooks/useLocation";
import type { HazardMapPointRes, HazardType } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

const HAZARD_TYPE_OPTIONS: Array<{ key: HazardType | "ALL"; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "FLOOD_DEEP", label: "Ngập sâu" },
  { key: "LANDSLIDE", label: "Sạt lở" },
  { key: "FALLEN_TREE", label: "Cây đổ" },
  { key: "POWER_LINE_DOWN", label: "Đứt đường điện" },
];

export default function HazardPointScreen() {
  const theme = useAppTheme();
  const coords = useUserCoordinates();
  const params = useLocalSearchParams<{ pointId?: string }>();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const addHazardSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    params.pointId || null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<HazardType | "ALL">("ALL");

  useEffect(() => {
    if (params.pointId) {
      setSelectedPointId(params.pointId);
      const timer = setTimeout(() => {
        detailSheetRef.current?.present();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [params.pointId]);

  const {
    data: mapPoints = [],
    isLoading,
    isRefetching,
    refetch,
  } = useMapPointsQuery(
    { pointTypes: ["HAZARD"] },
    { staleTime: 1000 * 60 * 3 },
  );

  const hazardPoints = useMemo(() => {
    return (mapPoints as HazardMapPointRes[])
      .map((pt) => {
        const distanceKm = coords
          ? calculateDistanceKm(
            coords.latitude,
            coords.longitude,
            pt.latitude,
            pt.longitude,
          )
          : undefined;
        return { ...pt, distanceKm };
      })
      .filter((pt) => {
        // Type filter
        if (selectedType !== "ALL" && pt.subType !== selectedType) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const label = hazardTypeLabel[pt.subType as HazardType]?.toLowerCase() || "";
          const status = pt.status?.toLowerCase() || "";
          if (!label.includes(q) && !status.includes(q) && !pt.subType?.toLowerCase().includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
  }, [mapPoints, coords, selectedType, searchQuery]);

  const handleOpenDetail = (id: string) => {
    setSelectedPointId(id);
    detailSheetRef.current?.present();
  };

  return (
    <ScreenContainer
      scrollable={false}
      className="flex-1 bg-background"
      header={
        <Header
          title="Điểm nguy hiểm"
          subtitle={`${hazardPoints.length} điểm cảnh báo nguy hiểm`}
          right={
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push("/(app)/map")}
                className="flex-row items-center rounded-xl bg-white/20 px-3 py-2 border border-white/30 active:opacity-70"
              >
                <Ionicons name="map-outline" size={18} color="#ffffff" />
                <Text className="ml-1.5 text-xs font-semibold text-white">
                  Bản đồ
                </Text>
              </Pressable>
            </View>
          }
        />
      }
    >

      {/* Search Input */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Tìm kiếm khu vực nguy hiểm..."
        className="mb-3"
      />

      {/* Filter Horizontal Chips */}
      <View className="mb-3">
        <FlatList
          horizontal
          data={HAZARD_TYPE_OPTIONS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
          renderItem={({ item }) => {
            const isSelected = selectedType === item.key;
            return (
              <Pressable
                onPress={() => setSelectedType(item.key)}
                className={`mr-2 rounded-full px-3.5 py-1.5 ${
                  isSelected
                    ? "bg-warning"
                    : "bg-surface shadow-xs"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isSelected ? "text-white font-semibold" : "text-text-muted"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* List content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-10">
          <ActivityIndicator size="large" color={theme.colors.warning} />
          <Text className="mt-3 text-sm text-text-muted">
            Đang tải danh sách điểm nguy hiểm...
          </Text>
        </View>
      ) : (
        <FlatList
          data={hazardPoints}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <HazardPointItem item={item} onPress={handleOpenDetail} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.warning]}
              tintColor={theme.colors.warning}
            />
          }
          contentContainerStyle={{ paddingBottom: 90 }}
          ListEmptyComponent={
            <View className="items-center justify-center rounded-2xl bg-surface p-8 shadow-xs mt-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-3">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={36}
                  color={theme.colors.success}
                />
              </View>
              <Text className="text-base font-bold text-text">
                Khu vực an toàn
              </Text>
              <Text className="mt-1 text-center text-xs text-text-muted">
                Không tìm thấy cảnh báo điểm nguy hiểm phù hợp với bộ lọc hiện tại.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Add Hazard Button */}
      <Pressable
        onPress={() => addHazardSheetRef.current?.present()}
        style={{
          position: "absolute",
          bottom: 24,
          right: 20,
          backgroundColor: theme.colors.warning,
          elevation: 6,
        }}
        className="flex-row items-center rounded-full px-4 py-3 shadow-lg active:opacity-85"
      >
        <Ionicons name="add" size={20} color="#ffffff" />
        <Text className="ml-1.5 text-sm font-bold text-white">
          Thêm cảnh báo
        </Text>
      </Pressable>

      {/* Map Point Detail Bottom Sheet */}
      <MapPointDetailBottomSheet
        ref={detailSheetRef}
        pointId={selectedPointId}
        onDismiss={() => setSelectedPointId(null)}
      />

      {/* Create Hazard Bottom Sheet */}
      <CreateHazardBottomSheet
        ref={addHazardSheetRef}
        onSuccess={() => {
          refetch();
        }}
      />
    </ScreenContainer>
  );
}
