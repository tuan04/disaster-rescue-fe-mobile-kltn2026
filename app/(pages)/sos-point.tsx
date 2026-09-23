import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import SearchBar from "@/components/common/SearchBar";
import MapPointDetailBottomSheet from "@/components/map/MapPointDetailBottomSheet";
import SosPointItem from "@/components/map/SosPointItem";
import { calculateDistanceKm } from "@/helpers/route";
import { useAppTheme } from "@/contants/theme";
import { useMapPointsQuery } from "@/hooks/queries";
import { useUserCoordinates } from "@/hooks/useLocation";
import type { EmergencyLevel, RequestStatus, SosMapPointRes } from "@/types/map";
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

export default function SosPointScreen() {
  const theme = useAppTheme();
  const coords = useUserCoordinates();
  const params = useLocalSearchParams<{ pointId?: string }>();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(
    params.pointId || null,
  );

  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL");
  const [levelFilter, setLevelFilter] = useState<EmergencyLevel | "ALL">("ALL");
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
  } = useMapPointsQuery({ pointTypes: ["SOS"] }, { staleTime: 1000 * 60 * 3 });

  const sosPoints = useMemo(() => {
    return (mapPoints as SosMapPointRes[])
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
        // Status filter
        if (statusFilter !== "ALL" && pt.status !== statusFilter) return false;
        // Emergency Level filter
        if (levelFilter !== "ALL" && pt.priority !== levelFilter) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const subType = pt.subType?.toLowerCase() || "";
          const priority = pt.priority?.toLowerCase() || "";
          const status = pt.status?.toLowerCase() || "";
          if (!subType.includes(q) && !priority.includes(q) && !status.includes(q)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        // Sort high priority first, then by distance
        if (a.priority === "HIGH" && b.priority !== "HIGH") return -1;
        if (b.priority === "HIGH" && a.priority !== "HIGH") return 1;
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
  }, [mapPoints, coords, statusFilter, levelFilter, searchQuery]);

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
          title="Điểm cần cứu trợ"
          subtitle={`${sosPoints.length} điểm cứu hộ đang yêu cầu`}
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
        placeholder="Tìm kiếm ca cứu hộ, số điện thoại, mô tả..."
        className="mb-3"
      />

      {/* Filter Tabs */}
      <View className="mb-3 flex-row space-x-2 gap-2">
        <Pressable
          onPress={() => {
            setStatusFilter("ALL");
            setLevelFilter("ALL");
          }}
          className={`rounded-full px-3.5 py-1.5 ${
            statusFilter === "ALL" && levelFilter === "ALL"
              ? "bg-danger"
              : "bg-surface shadow-xs"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              statusFilter === "ALL" && levelFilter === "ALL"
                ? "text-white font-semibold"
                : "text-text-muted"
            }`}
          >
            Tất cả
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setStatusFilter("PENDING");
            setLevelFilter("ALL");
          }}
          className={`rounded-full px-3.5 py-1.5 ${
            statusFilter === "PENDING"
              ? "bg-warning"
              : "bg-surface shadow-xs"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              statusFilter === "PENDING" ? "text-white font-semibold" : "text-text-muted"
            }`}
          >
            Đang chờ
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setLevelFilter("HIGH");
            setStatusFilter("ALL");
          }}
          className={`rounded-full px-3.5 py-1.5 ${
            levelFilter === "HIGH"
              ? "bg-danger"
              : "bg-surface shadow-xs"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              levelFilter === "HIGH" ? "text-white font-semibold" : "text-text-muted"
            }`}
          >
            Khẩn cấp cao
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setStatusFilter("ACCEPTED");
            setLevelFilter("ALL");
          }}
          className={`rounded-full px-3.5 py-1.5 ${
            statusFilter === "ACCEPTED"
              ? "bg-secondary"
              : "bg-surface shadow-xs"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              statusFilter === "ACCEPTED" ? "text-white font-semibold" : "text-text-muted"
            }`}
          >
            Đã tiếp nhận
          </Text>
        </Pressable>
      </View>

      {/* List content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center py-10">
          <ActivityIndicator size="large" color={theme.colors.danger} />
          <Text className="mt-3 text-sm text-text-muted">
            Đang tải danh sách điểm cứu trợ...
          </Text>
        </View>
      ) : (
        <FlatList
          data={sosPoints}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SosPointItem item={item} onPress={handleOpenDetail} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[theme.colors.danger]}
              tintColor={theme.colors.danger}
            />
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View className="items-center justify-center rounded-2xl bg-surface p-8 shadow-xs mt-6">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-danger/10 mb-3">
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={36}
                  color={theme.colors.danger}
                />
              </View>
              <Text className="text-base font-bold text-text">
                Không tìm thấy điểm cứu trợ nào
              </Text>
              <Text className="mt-1 text-center text-xs text-text-muted">
                Hiện tại không có yêu cầu cứu trợ phù hợp với bộ lọc đã chọn.
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
