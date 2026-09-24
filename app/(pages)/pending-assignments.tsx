import Header from "@/components/common/Header";
import ScreenContainer from "@/components/common/ScreenContainer";
import PendingAssignmentCard from "@/components/pending-assignment/PendingAssignmentCard";
import PendingAssignmentDetailBottomSheet from "@/components/pending-assignment/PendingAssignmentDetailBottomSheet";
import RejectAssignmentModal from "@/components/pending-assignment/RejectAssignmentModal";
import { useAppTheme } from "@/constants/theme";
import { saveActiveMission } from "@/database";
import { makePhoneCall } from "@/helpers/phone";
import { calculateDistanceKm } from "@/helpers/route";
import {
  ACTIVE_MISSION_QUERY_KEY,
  useActiveMission,
} from "@/hooks/useActiveMission";
import { useLocation } from "@/hooks/useLocation";
import {
  acceptAssignedRescue,
  getPendingAssignmentsByTeamId,
  rejectAssignedRescue,
} from "@/services/assignment.service";
import { getRoute } from "@/services/map.service";
import type { RootState } from "@/store";
import type { EmergencyLevel, MapPointDetailRes } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSelector } from "react-redux";

type FilterLevel = EmergencyLevel | "ALL";

export default function PendingAssignmentsScreen() {
  const theme = useAppTheme();
  const { coords } = useLocation();
  const { activeMission } = useActiveMission();

  // Lấy teamId trực tiếp từ UserInfoResponse (Redux state.auth.user)
  const auth = useSelector((state: RootState) => state.auth);
  const teamId = auth?.user?.teamId;

  console.log("teamId", teamId);

  const [levelFilter, setLevelFilter] = useState<FilterLevel>("ALL");
  const [selectedItem, setSelectedItem] = useState<MapPointDetailRes | null>(
    null,
  );

  const detailSheetRef = useRef<BottomSheetModal>(null);

  // Gọi API lấy danh sách nhiệm vụ được phân công cho đội
  const {
    data: assignments = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<MapPointDetailRes[]>({
    queryKey: ["pendingAssignments", teamId],
    queryFn: () => getPendingAssignmentsByTeamId(teamId!),
    enabled: !!teamId,
    staleTime: 1000 * 30, // 30s
  });

  // Tự động làm mới dữ liệu khi người dùng focus vào màn hình
  useFocusEffect(
    useCallback(() => {
      if (teamId) {
        refetch();
      }
    }, [teamId, refetch]),
  );

  // Tính khoảng cách GPS và lọc danh sách
  const filteredAssignments = useMemo(() => {
    return assignments
      .map((pt) => {
        const distanceKm =
          coords && pt.latitude && pt.longitude
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
        const emergencyLevel =
          pt.pointType === "SOS" ? pt.detail.emergencyLevel : "MEDIUM";
        // Lọc theo mức độ khẩn cấp
        if (levelFilter !== "ALL" && emergencyLevel !== levelFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const levelA = a.pointType === "SOS" ? a.detail.emergencyLevel : "LOW";
        const levelB = b.pointType === "SOS" ? b.detail.emergencyLevel : "LOW";

        // Ưu tiên HIGH trước
        if (levelA === "HIGH" && levelB !== "HIGH") return -1;
        if (levelB === "HIGH" && levelA !== "HIGH") return 1;

        // Sau đó sắp xếp theo khoảng cách gần nhất
        if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
  }, [assignments, coords, levelFilter]);

  const handleOpenDetail = useCallback((item: MapPointDetailRes) => {
    setSelectedItem(item);
    detailSheetRef.current?.present();
  }, []);

  const handleCallPhone = useCallback((phone?: string) => {
    makePhoneCall(phone);
  }, []);

  const queryClient = useQueryClient();
  const [rejectingItem, setRejectingItem] = useState<MapPointDetailRes | null>(
    null,
  );

  // Mutation gọi API từ chối nhận nhiệm vụ
  const rejectMutation = useMutation({
    mutationFn: async ({
      teamId,
      requestId,
      reason,
    }: {
      teamId: string;
      requestId: string;
      reason?: string;
    }) => {
      await rejectAssignedRescue(teamId, requestId, reason);
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Đã từ chối nhiệm vụ",
        text2: "Nhiệm vụ đã được gỡ khỏi danh sách chờ của đội",
      });
      setRejectingItem(null);
      detailSheetRef.current?.dismiss();
      queryClient.invalidateQueries({
        queryKey: ["pendingAssignments", teamId],
      });
    },
    onError: (error: any) => {
      const errorMsg =
        error?.message ||
        error?.response?.data?.message ||
        "Không thể từ chối nhiệm vụ. Vui lòng thử lại!";
      Toast.show({
        type: "error",
        text1: "Từ chối thất bại",
        text2: errorMsg,
      });
    },
  });

  const [rescuingItemId, setRescuingItemId] = useState<string | null>(null);

  // Mutation gọi API tiếp nhận nhiệm vụ cứu hộ
  const acceptMutation = useMutation({
    mutationFn: async (item: MapPointDetailRes) => {
      if (!teamId) {
        throw new Error("Không tìm thấy thông tin đội cứu hộ của bạn");
      }
      await acceptAssignedRescue(teamId, item.id);
      return item;
    },
    onSuccess: async (item) => {
      Toast.show({
        type: "success",
        text1: "Tiếp nhận thành công!",
        text2: "Đã tiếp nhận ca cứu hộ. Đang mở dẫn đường...",
      });

      detailSheetRef.current?.dismiss();

      // Làm mới danh sách nhiệm vụ chờ và bản đồ
      queryClient.invalidateQueries({
        queryKey: ["pendingAssignments", teamId],
      });
      queryClient.invalidateQueries({
        queryKey: ["mapPoints"],
      });

      // Tính lộ trình dẫn đường đến hiện trường (nếu có GPS)
      let routeData = null;
      if (coords?.latitude && coords?.longitude) {
        try {
          routeData = await getRoute(
            coords.latitude,
            coords.longitude,
            item.id,
          );
        } catch (routeErr) {
          console.warn("[pending-assignments] Lỗi tính lộ trình:", routeErr);
        }
      }

      // Lưu ca cứu hộ vào SQLite để hỗ trợ offline và load tức thì trên màn hình dẫn đường
      try {
        await saveActiveMission({
          id: item.id,
          requestId: item.id,
          targetLatitude: item.latitude,
          targetLongitude: item.longitude,
          address: item.address,
          reporterPhone:
            item.pointType === "SOS" ? item.detail.reporterPhone : null,
          routeData,
        });
        queryClient.invalidateQueries({ queryKey: ACTIVE_MISSION_QUERY_KEY });
      } catch (e) {
        console.warn("[pending-assignments] Lỗi lưu SQLite active mission:", e);
      }

      setRescuingItemId(null);
      // Chuyển hướng ngay sang màn hình dẫn đường chuyên dụng
      router.push("/(pages)/mission-navigation");
    },
    onError: (error: any) => {
      setRescuingItemId(null);
      const errorMsg =
        error?.message ||
        error?.response?.data?.message ||
        "Không thể tiếp nhận ca cứu hộ. Vui lòng thử lại!";
      Toast.show({
        type: "error",
        text1: "Tiếp nhận thất bại",
        text2: errorMsg,
      });
      // Làm mới lại danh sách phòng trường hợp ca này đã có đội khác tiếp nhận
      queryClient.invalidateQueries({
        queryKey: ["pendingAssignments", teamId],
      });
    },
  });

  const handleRescue = useCallback(
    (item: MapPointDetailRes) => {
      if (acceptMutation.isPending) return;

      // 1. Kiểm tra nếu đội đang có ca cứu hộ hoạt động dở
      if (activeMission) {
        Alert.alert(
          "Đội đang trong ca cứu hộ",
          "Đội của bạn hiện đang thực hiện một ca cứu hộ khác. Bạn cần hoàn thành hoặc hủy ca hiện tại trước khi tiếp nhận ca mới.",
          [
            { text: "Đóng", style: "cancel" },
            {
              text: "Xem ca hiện tại",
              onPress: () => router.push("/(pages)/mission-navigation"),
            },
          ],
        );
        return;
      }

      // 2. Xác nhận nhận cứu hộ
      const locationText =
        item.address ||
        `Tọa độ (${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)})`;

      Alert.alert(
        "Xác nhận nhận cứu hộ",
        `Bạn có chắc chắn đội sẽ tiếp nhận thực hiện ca cứu hộ này?\n\nĐịa điểm: ${locationText}`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Tiếp nhận ngay",
            onPress: () => {
              setRescuingItemId(item.id);
              acceptMutation.mutate(item);
            },
          },
        ],
      );
    },
    [activeMission, acceptMutation],
  );

  const handleReject = useCallback((item: MapPointDetailRes) => {
    setRejectingItem(item);
  }, []);

  const handleConfirmReject = useCallback(
    (reason?: string) => {
      if (!teamId || !rejectingItem) return;
      rejectMutation.mutate({
        teamId,
        requestId: rejectingItem.id,
        reason,
      });
    },
    [teamId, rejectingItem, rejectMutation],
  );

  const handleCancelRejectModal = useCallback(() => {
    if (rejectMutation.isPending) return;
    setRejectingItem(null);
  }, [rejectMutation.isPending]);


  return (
    <ScreenContainer
      scrollable={false}
      className="flex-1 bg-background"
      header={
        <Header
          title="Nhiệm vụ được gán"
          subtitle={
            teamId
              ? `${filteredAssignments.length} nhiệm vụ chờ tiếp nhận`
              : "Chưa liên kết đội"
          }
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
      {/* 1. Nếu chưa tham gia đội cứu hộ */}
      {!teamId || !auth.isAuthenticated  ? (
        <View className="flex-1 items-center justify-center p-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 mb-4">
            <Ionicons
              name="people-outline"
              size={42}
              color={theme.colors.warning}
            />
          </View>
          <Text className="text-lg font-bold text-text text-center">
            Chưa có thông tin đội cứu hộ
          </Text>
          <Text className="mt-2 text-center text-xs text-textMuted leading-5 px-4">
            Tài khoản của bạn hiện chưa được phân vào đội cứu hộ nào hoặc chưa kích hoạt vai trò cứu hộ viên để nhận nhiệm vụ phân công.
          </Text>
          <Pressable
            onPress={() => router.push("/(app)/setting")}
            className="mt-6 flex-row items-center rounded-xl bg-primary px-5 py-3 active:opacity-85"
          >
            <Ionicons name="settings-outline" size={18} color="#ffffff" />
            <Text className="ml-2 text-xs font-bold text-white">
              Xem cài đặt tài khoản
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* 2. Bộ lọc mức độ khẩn cấp */}
          <View className="mb-3 flex-row space-x-2 gap-2">
            <Pressable
              onPress={() => setLevelFilter("ALL")}
              className={`rounded-full px-3.5 py-1.5 ${
                levelFilter === "ALL" ? "bg-primary" : "bg-surface shadow-xs"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  levelFilter === "ALL"
                    ? "text-white font-semibold"
                    : "text-textMuted"
                }`}
              >
                Tất cả ({assignments.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLevelFilter("HIGH")}
              className={`rounded-full px-3.5 py-1.5 ${
                levelFilter === "HIGH" ? "bg-danger" : "bg-surface shadow-xs"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  levelFilter === "HIGH"
                    ? "text-white font-semibold"
                    : "text-textMuted"
                }`}
              >
                Khẩn cấp cao
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLevelFilter("MEDIUM")}
              className={`rounded-full px-3.5 py-1.5 ${
                levelFilter === "MEDIUM" ? "bg-warning" : "bg-surface shadow-xs"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  levelFilter === "MEDIUM"
                    ? "text-white font-semibold"
                    : "text-textMuted"
                }`}
              >
                Trung bình
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLevelFilter("LOW")}
              className={`rounded-full px-3.5 py-1.5 ${
                levelFilter === "LOW" ? "bg-success" : "bg-surface shadow-xs"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  levelFilter === "LOW"
                    ? "text-white font-semibold"
                    : "text-textMuted"
                }`}
              >
                Thấp
              </Text>
            </Pressable>
          </View>

          {/* 4. Danh sách nhiệm vụ */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center py-10">
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text className="mt-3 text-sm text-textMuted">
                Đang tải danh sách nhiệm vụ được gán...
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredAssignments}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <PendingAssignmentCard
                  item={item}
                  onPress={handleOpenDetail}
                  onCall={handleCallPhone}
                  onRescue={handleRescue}
                  onReject={handleReject}
                  isRescuing={
                    acceptMutation.isPending && rescuingItemId === item.id
                  }
                />
              )}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                <View className="items-center justify-center rounded-2xl bg-surface p-8 shadow-xs mt-6 border border-slate-100 dark:border-slate-800">
                  <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={36}
                      color="#059669"
                    />
                  </View>
                  <Text className="text-base font-bold text-text">
                    Không có nhiệm vụ chờ
                  </Text>
                  <Text className="mt-1 text-center text-xs text-textMuted leading-4">
                    Hiện tại chưa có yêu cầu cứu hộ nào được gán cho đội của bạn
                    hoặc các nhiệm vụ đã được xử lý xong.
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* 5. BottomSheet chi tiết nhiệm vụ */}
      <PendingAssignmentDetailBottomSheet
        ref={detailSheetRef}
        item={selectedItem}
        onCall={handleCallPhone}
        onViewOnMap={() => router.push("/(app)/map")}
        onReject={handleReject}
        onRescue={handleRescue}
        isRescuing={
          acceptMutation.isPending && rescuingItemId === selectedItem?.id
        }
      />

      {/* 6. Modal xác nhận từ chối nhiệm vụ */}
      <RejectAssignmentModal
        visible={!!rejectingItem}
        loading={rejectMutation.isPending}
        item={rejectingItem}
        onDismiss={handleCancelRejectModal}
        onConfirm={handleConfirmReject}
      />
    </ScreenContainer>
  );
}
