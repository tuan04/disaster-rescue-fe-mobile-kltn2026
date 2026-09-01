import EmergencyLevelBadge from "@/components/common/EmergencyLevelBadge";
import { useAppTheme } from "@/contants/theme";
import type { AppDispatch, RootState } from "@/store";
import { dismissCurrentAlert } from "@/store/notificationSlice";
import type { EmergencyLevel } from "@/types/map";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

export default function SosAlertModal() {
  const theme = useAppTheme();
  const dispatch = useDispatch<AppDispatch>();
  const currentAlert = useSelector(
    (state: RootState) => state.notification?.currentAlert,
  );

  if (!currentAlert) {
    return null;
  }

  const handleDismiss = () => {
    dispatch(dismissCurrentAlert());
  };

  const handleGoToMap = () => {
    dispatch(dismissCurrentAlert());
    router.push("/(app)/map");
  };

  const handleGoToSosList = () => {
    dispatch(dismissCurrentAlert());
    router.push("/(pages)/sos-point");
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!currentAlert}
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-5">
        <View className="w-full rounded-3xl bg-surface p-5 border-2 border-danger shadow-2xl">
          {/* Header Icon & Badge */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-row items-center">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 border border-danger/30">
                <Ionicons name="warning" size={26} color={theme.colors.danger} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-danger">
                  CẢNH BÁO CỨU HỘ KHẨN CẤP
                </Text>
                <Text className="text-xs text-text-muted">
                  Vừa nhận được thông báo thời gian thực
                </Text>
              </View>
            </View>

            {currentAlert.emergencyLevel && (
              <EmergencyLevelBadge
                level={(currentAlert.emergencyLevel as EmergencyLevel) || "HIGH"}
              />
            )}
          </View>

          {/* Title & Body Content */}
          <Text className="text-base font-bold text-text mb-1.5">
            {currentAlert.title}
          </Text>
          <Text className="text-sm text-text-muted leading-5 mb-4">
            {currentAlert.content}
          </Text>

          {/* Details (Phone / Location if available) */}
          {(currentAlert.reporterPhone || (currentAlert.latitude && currentAlert.longitude)) && (
            <View className="mb-4 rounded-2xl bg-background p-3 border border-outline/15 space-y-1">
              {currentAlert.reporterPhone ? (
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={14} color={theme.colors.textMuted} />
                  <Text className="ml-1.5 text-xs text-text">
                    SĐT người báo: <Text className="font-semibold">{currentAlert.reporterPhone}</Text>
                  </Text>
                </View>
              ) : null}

              {currentAlert.latitude && currentAlert.longitude ? (
                <View className="flex-row items-center mt-1">
                  <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                  <Text className="ml-1.5 text-xs text-text">
                    Tọa độ: {currentAlert.latitude.toFixed(4)}, {currentAlert.longitude.toFixed(4)}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Action Buttons */}
          <View className="space-y-2">
            <Pressable
              onPress={handleGoToMap}
              className="w-full flex-row items-center justify-center rounded-xl bg-danger py-3.5 shadow-md active:opacity-85"
            >
              <Ionicons name="map-outline" size={18} color="#ffffff" />
              <Text className="ml-2 font-bold text-white text-sm">
                Xem vị trí trên bản đồ
              </Text>
            </Pressable>

            <Pressable
              onPress={handleGoToSosList}
              className="w-full flex-row items-center justify-center rounded-xl bg-surfaceVariant py-3 active:opacity-75"
            >
              <Ionicons name="list-outline" size={18} color={theme.colors.onSurface} />
              <Text className="ml-2 font-semibold text-text text-sm">
                Danh sách cứu hộ
              </Text>
            </Pressable>

            <Pressable
              onPress={handleDismiss}
              className="w-full py-2 items-center justify-center active:opacity-60"
            >
              <Text className="text-xs font-medium text-text-muted">
                Bỏ qua
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
