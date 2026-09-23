import SearchBar from "@/components/common/SearchBar";
import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import { calculateDistanceKm } from "@/helpers/route";
import WarehousePointItem from "@/components/map/WarehousePointItem";
import { useAppTheme } from "@/contants/theme";
import { useMapPointsQuery } from "@/hooks/queries";
import { useUserCoordinates } from "@/hooks/useLocation";
import type { WarehouseMapPointRes } from "@/types/map";
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
  View,
} from "react-native";

export default function WarehousePointScreen() {
  const theme = useAppTheme();
  const coords = useUserCoordinates();
  const params = useLocalSearchParams<{ pointId?: string }>();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    params.pointId || null,
  );

  const [searchQuery, setSearchQuery] = useState("");

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
    { pointTypes: ["WARE_HOUSE"] },
    { staleTime: 1000 * 60 * 3 },
  );

  const warehousePoints = useMemo(() => {
    return (mapPoints as WarehouseMapPointRes[])
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
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const subType = pt.subType?.toLowerCase() || "";
          const status = pt.status?.toLowerCase() || "";
          if (!subType.includes(q) && !status.includes(q)) {
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
  }, [mapPoints, coords, searchQuery]);

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
          title="Kho & Điểm cứu trợ"
          subtitle={`${warehousePoints.length} điểm tập kết nhu yếu phẩm & vật tư`}
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
        placeholder="Tìm kiếm kho cứu trợ, điểm tiếp tế..."
        className="mb-3"
      />

      {/* List content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-10">
          <ActivityIndicator size="large" color={theme.colors.secondary} />
          <Text className="mt-3 text-sm text-text-muted">
            Đang tải danh sách kho cứu trợ...
          </Text>
        </View>
      ) : (
        <FlatList
          data={warehousePoints}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <WarehousePointItem item={item} onPress={handleOpenDetail} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.secondary]}
              tintColor={theme.colors.secondary}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center rounded-2xl bg-surface p-8 shadow-xs mt-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-secondary/10 mb-3">
                <Ionicons name="cube-outline" size={36} color={theme.colors.secondary} />
              </View>
              <Text className="text-base font-bold text-text">
                Chưa có kho cứu trợ
              </Text>
              <Text className="mt-1 text-center text-xs text-text-muted">
                Hiện chưa có thông tin kho cứu trợ phù hợp với tìm kiếm.
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

