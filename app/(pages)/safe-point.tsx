import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import SearchBar from "@/components/common/SearchBar";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import SafePointItem from "@/components/map/SafePointItem";
import { safePointTypeLabel } from "@/constants/mapPointLables";
import { calculateDistanceKm } from "@/helpers/route";
import { useAppTheme } from "@/constants/theme";
import { useMapPointsQuery } from "@/hooks/queries";
import { useUserCoordinates } from "@/hooks/useLocation";
import type { SafePointType, SafeZoneMapPointRes } from "@/types/map";
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
  TextInput,
  View,
} from "react-native";

const SAFE_POINT_TYPE_OPTIONS: Array<{ key: SafePointType | "ALL"; label: string }> = [
  { key: "ALL", label: "Tất cả" },
  { key: "EVACUATION_CENTER", label: "Trung tâm sơ tán" },
  { key: "MEDICAL_STATION", label: "Trạm y tế" },
  { key: "TEMPORARY_CAMP", label: "Trại tạm" },
  { key: "WATER_STATION", label: "Trạm cấp nước" },
];

export default function SafePointScreen() {
  const theme = useAppTheme();
  const coords = useUserCoordinates();
  const params = useLocalSearchParams<{ pointId?: string }>();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    params.pointId || null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<SafePointType | "ALL">("ALL");

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
    { pointTypes: ["SAFE_ZONE"] },
    { staleTime: 1000 * 60 * 3 },
  );

  const safePoints = useMemo(() => {
    return (mapPoints as SafeZoneMapPointRes[])
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
          const label = safePointTypeLabel[pt.subType as SafePointType]?.toLowerCase() || "";
          const status = pt.status?.toLowerCase() || "";
          if (!label.includes(q) && !status.includes(q) && !pt.subType.toLowerCase().includes(q)) {
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
          title="Điểm an toàn & Sơ tán"
          subtitle={`${safePoints.length} địa điểm an toàn, hỗ trợ y tế & nhu yếu phẩm`}
          right={
            <Pressable
              onPress={() => router.push("/(app)/map")}
              className="flex-row items-center rounded-xl bg-white/20 px-3 py-2 border border-white/30 active:opacity-70"
            >
              <Ionicons name="map-outline" size={18} color="#ffffff" />
              <Text className="ml-1.5 text-xs font-semibold text-white">
                Bản đồ
              </Text>
            </Pressable>
          }
        />
      }
    >

      {/* Search Input */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Tìm kiếm điểm an toàn, trạm y tế..."
        className="mb-3"
      />

      {/* Filter Horizontal Chips */}
      <View className="mb-3">
        <FlatList
          horizontal
          data={SAFE_POINT_TYPE_OPTIONS}
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
                    ? "bg-success"
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
          <ActivityIndicator size="large" color={theme.colors.success} />
          <Text className="mt-3 text-sm text-text-muted">
            Đang tải danh sách điểm an toàn...
          </Text>
        </View>
      ) : (
        <FlatList
          data={safePoints}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SafePointItem item={item} onPress={handleOpenDetail} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.success]}
              tintColor={theme.colors.success}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center rounded-2xl bg-surface p-8 shadow-xs mt-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-3">
                <Ionicons name="shield-checkmark-outline" size={36} color={theme.colors.success} />
              </View>
              <Text className="text-base font-bold text-text">
                Chưa có điểm an toàn
              </Text>
              <Text className="mt-1 text-center text-xs text-text-muted">
                Không tìm thấy điểm an toàn phù hợp với bộ lọc đã chọn.
              </Text>
            </View>
          }
        />
      )}

      {/* Map Point Detail Bottom Sheet */}
      <MapPointDetailBottomSheet
        ref={detailSheetRef}
        pointId={selectedPointId}
        onDismiss={() => setSelectedPointId(null)}
      />
    </ScreenContainer>
  );
}

