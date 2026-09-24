import CancelMissionModal from "@/components/map/CancelMissionModal";
import MissionNavigationBottomSheet from "@/components/map/MissionNavigationBottomSheet";
import RoutePolyline from "@/components/map/RoutePolyline";
import ScreenContainer from "@/components/common/ScreenContainer";
import TargetPointMarker from "@/components/map/TargetPointMarker";
import UserLocationMarker from "@/components/map/UserLocationMarker";
import { MAP_STYLE_URL } from "@/constants/mapConfig";
import {
  extractRouteSteps,
  getNavigationProgress,
} from "@/helpers/navigation";
import { useLocation } from "@/hooks/useLocation";
import { useRescue } from "@/hooks/useRescue";
import { useActiveMission } from "@/hooks/useActiveMission";
import { useMapPointDetailQuery } from "@/hooks/queries";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type BottomSheet from "@gorhom/bottom-sheet";
import {
  Camera,
  type CameraRef,
  Map,
} from "@maplibre/maplibre-react-native";
import { makePhoneCall } from "@/helpers/phone";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { calculateDistanceMeters } from "@/helpers/route";

export default function MissionNavigationScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);

  // Lấy vị trí, la bàn và tốc độ di chuyển hiện tại của đội cứu hộ
  const { coords, permissionDenied, heading, speed } = useLocation();
  const currentLat = coords.latitude;
  const currentLng = coords.longitude;

  // Quản lý lộ trình và ca cứu hộ đang hoạt động (tự động cắt bỏ đoạn đường đã đi qua)
  const {
    activeRoute,
    activeMission,
    routeGeoJSON,
    remainingRouteGeoJSON,
    remainingDistance,
    distanceText,
    durationText,
    etaTimeStr,
    clearRoute,
    isRerouting,
    reroute,
  } = useActiveMission({
    cameraRef,
    currentLat,
    currentLng,
  });

  const currentRouteGeoJSON = remainingRouteGeoJSON || routeGeoJSON;

  // Nghiệp vụ ca cứu hộ (hủy ca, hoàn thành ca)
  const {
    handleCompleteMission,
    isCompleting,
    cancelRescueMutation,
    isCanceling,
  } = useRescue();

  const [isCancelModalVisible, setIsCancelModalVisible] = useState<boolean>(false);

  const handleOpenCancelModal = useCallback(() => {
    setIsCancelModalVisible(true);
  }, []);

  const handleCloseCancelModal = useCallback(() => {
    setIsCancelModalVisible(false);
  }, []);

  const handleConfirmCancel = useCallback(
    (reason: string) => {
      if (!activeMission?.id) return;
      cancelRescueMutation.mutate({
        assignmentId: activeMission.id,
        reason,
        onBeforeLeave: async () => {
          clearRoute();
        },
      });
    },
    [activeMission?.id, cancelRescueMutation, clearRoute],
  );

  // Trích xuất các bước rẽ và tính toán trạng thái dẫn đường từng bước
  const routeSteps = useMemo(() => {
    return extractRouteSteps(activeRoute || activeMission?.route);
  }, [activeRoute, activeMission?.route]);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Reset bước dẫn đường khi lộ trình được tính lại
  useEffect(() => {
    setCurrentStepIndex(0);
  }, [routeSteps]);

  const navProgress = useMemo(() => {
    return getNavigationProgress(
      routeSteps,
      currentLat,
      currentLng,
      currentStepIndex,
    );
  }, [routeSteps, currentLat, currentLng, currentStepIndex]);

  useEffect(() => {
    if (navProgress.currentStepIndex !== currentStepIndex) {
      setCurrentStepIndex(navProgress.currentStepIndex);
    }
  }, [navProgress.currentStepIndex, currentStepIndex]);

  // Tự động bám theo vị trí đội cứu hộ ở góc nhìn 3D dẫn đường
  const [isFollowingUser, setIsFollowingUser] = useState<boolean>(true);

  // Cờ nhận biết camera đang trong hiệu ứng trượt tới (flyTo) để không bị useEffect ghi đè
  const isFlyingRef = useRef<boolean>(false);
  const recenterAnim = useRef(new Animated.Value(0)).current;

  // Hiệu ứng hiện / ẩn mượt mà cho nút "Về giữa"
  useEffect(() => {
    Animated.timing(recenterAnim, {
      toValue: isFollowingUser ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isFollowingUser, recenterAnim]);

  // Tự động di chuyển camera bám theo vị trí đội cứu hộ
  useEffect(() => {
    if (!cameraRef.current || !coords || isFlyingRef.current) return;

    if (isFollowingUser) {
      cameraRef.current.setStop({
        center: [coords.longitude, coords.latitude],
        zoom: 17,
        pitch: 65,
        bearing: 0,
        duration: 350,
        padding: {
          bottom: insets.bottom + 130,
          top: insets.top + 110,
          left: 20,
          right: 20,
        },
      });
    }
  }, [
    coords.latitude,
    coords.longitude,
    isFollowingUser,
    insets.bottom,
    insets.top,
  ]);

  // Bám sát vị trí đội cứu hộ
  const handleFocusUserLocation = useCallback(() => {
    if (!coords || !cameraRef.current) return;

    isFlyingRef.current = true;
    setIsFollowingUser(true);

    cameraRef.current.flyTo({
      center: [coords.longitude, coords.latitude],
      zoom: 17,
      pitch: 65,
      bearing: 0,
      duration: 1000,
      padding: {
        bottom: insets.bottom + 130,
        top: insets.top + 110,
        left: 20,
        right: 20,
      },
    });

    setTimeout(() => {
      isFlyingRef.current = false;
    }, 1050);
  }, [coords, insets.bottom, insets.top]);

  const bottomSheetRef = useRef<BottomSheet>(null);

  const targetLat = activeMission?.target_latitude;
  const targetLng = activeMission?.target_longitude;

  // Truy vấn chi tiết yêu cầu cứu hộ từ backend
  const { data: detailRes } = useMapPointDetailQuery(
    activeMission?.request_id,
  );

  const sosDetail =
    detailRes?.pointType === "SOS" ? detailRes.detail : null;
  const displayPhone =
    sosDetail?.reporterPhone || activeMission?.reporter_phone || "Chưa cập nhật";
  const displayContent =
    sosDetail?.content || "Yêu cầu cứu trợ khẩn cấp";
  const displayEmergencyLevel = sosDetail?.emergencyLevel || "HIGH";
  const displayAddress =
    detailRes?.address || activeMission?.address || "Chưa xác định địa chỉ";

  // Tính khoảng cách đến đích và điều kiện cho phép hoàn thành nhiệm vụ
  const distanceToTarget = useMemo(() => {
    if (!targetLat || !targetLng || !currentLat || !currentLng) return Infinity;
    return calculateDistanceMeters(
      currentLat,
      currentLng,
      targetLat,
      targetLng,
    );
  }, [currentLat, currentLng, targetLat, targetLng]);

  const canComplete = useMemo(() => {
    return (
      distanceToTarget <= 50 ||
      remainingDistance <= 50 ||
      navProgress.currentStep?.maneuver === "arrive" ||
      navProgress.primaryManeuver?.actionText === "Đến nơi"
    );
  }, [
    distanceToTarget,
    remainingDistance,
    navProgress.currentStep?.maneuver,
    navProgress.primaryManeuver?.actionText,
  ]);

  // Gọi điện thoại cho nạn nhân
  const handleCallReporter = useCallback(() => {
    makePhoneCall(displayPhone);
  }, [displayPhone]);

  return (
    <ScreenContainer isEdgeToEdge={true} className="flex-1">
      <Map
        style={StyleSheet.absoluteFillObject}
        mapStyle={MAP_STYLE_URL}
        attribution={false}
        logo={false}
        touchPitch={true}
        touchRotate={true}
        onRegionWillChange={(e: any) => {
          const isUser =
            e?.properties?.isUserInteraction ??
            e?.nativeEvent?.properties?.isUserInteraction;
          if (isUser) {
            setIsFollowingUser(false);
          }
        }}
        onTouchMove={() => {
          if (isFollowingUser) {
            setIsFollowingUser(false);
          }
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [currentLng, currentLat],
            zoom: 17,
            pitch: 65,
            bearing: 0,
          }}
        />

        {/* 1. Lộ trình dẫn đường Polyline */}
        <RoutePolyline id="navRoute" data={currentRouteGeoJSON} />

        {/* 2. Vị trí Đội cứu hộ (với la bàn & vệt sáng hình quạt) */}
        <UserLocationMarker
          id="nav-user-location"
          latitude={currentLat}
          longitude={currentLng}
          heading={heading}
          mapBearing={0}
          permissionDenied={permissionDenied}
        />

        {/* 3. Điểm đích SOS của nạn nhân */}
        {targetLat && targetLng && (
          <TargetPointMarker
            id="nav-target-location"
            latitude={targetLat}
            longitude={targetLng}
          />
        )}
      </Map>

      {/* --- BẢNG DẪN ĐƯỜNG --- */}
      <View
        className="absolute left-3 right-3 z-20 shadow-2xl elevation-10"
        style={{ top: insets.top + 8 }}
      >
        {/* Khung chính: Mũi tên - Tên đường & số km/m đếm ngược nằm bên dưới */}
        <View
          className="bg-secondary rounded-3xl p-4 flex-row items-center justify-between shadow-2xl"
          style={
            navProgress.showSecondary && navProgress.secondaryManeuver
              ? { borderBottomLeftRadius: 0 }
              : undefined
          }
        >
          <View className="w-12 items-center justify-center mr-2">
            {isRerouting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialCommunityIcons
                name={navProgress.primaryManeuver.iconName}
                size={35}
                color="#ffffff"
              />
            )}
          </View>

          <View className="flex-1 pr-2">
            <Text
              className="text-2xl font-semibold text-white leading-tight"
              numberOfLines={1}
            >
              {isRerouting
                ? "Đang tìm đường mới..."
                : navProgress.primaryManeuver.streetName}
            </Text>
            <Text
              className="text-sm font-bold text-white/90 mt-0.5"
              numberOfLines={1}
            >
              {isRerouting ? (
                "Vui lòng tiếp tục di chuyển..."
              ) : (
                <>
                  {navProgress.distanceText || "0 m"}
                  {navProgress.primaryManeuver.actionText
                    ? ` • ${navProgress.primaryManeuver.actionText}`
                    : ""}
                </>
              )}
            </Text>
          </View>

          {/* Nút bấm tìm lại đường thủ công khi cần */}
          <Pressable
            onPress={() => reroute()}
            disabled={isRerouting}
            className="w-10 h-10 rounded-full bg-white/15 items-center justify-center active:bg-white/25"
            hitSlop={8}
            accessibilityLabel="Tìm lại lộ trình"
          >
            <Ionicons name="refresh" size={20} color="#ffffff" />
          </Pressable>
        </View>

        {navProgress.showSecondary && navProgress.secondaryManeuver && (
          <View className="self-start bg-secondary rounded-b-2xl px-4 py-2 flex-row items-center gap-2.5 shadow-lg border-t border-white/20">
            <MaterialCommunityIcons
              name={navProgress.secondaryManeuver.iconName}
              size={25}
              color="#ffffff"
            />
            <View>
              <Text className="text-white/80 font-semibold text-xs uppercase tracking-wider">
                Sau đó
              </Text>
              <Text
                className="text-white font-semibold text-sm max-w-[200px]"
                numberOfLines={1}
              >
                {navProgress.secondaryManeuver.streetName}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* --- ĐỒNG HỒ TỐC ĐỘ --- */}
      <View
        className="absolute left-4"
        style={{ bottom: insets.bottom + 85, zIndex: 5, elevation: 5 }}
      >
        <View className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-lg border border-gray-100 dark:border-gray-700">
          <Text className="text-base font-black text-slate-900 dark:text-white leading-tight">
            {speed ?? 0}
          </Text>
          <Text className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
            km/h
          </Text>
        </View>
      </View>

      {/* --- NÚT "VỀ GIỮA" --- */}
      <Animated.View
        pointerEvents={isFollowingUser ? "none" : "auto"}
        className="absolute self-center"
        style={{
          bottom: insets.bottom + 85,
          zIndex: 5,
          elevation: 5,
          opacity: recenterAnim,
          transform: [
            {
              translateY: recenterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
            {
              scale: recenterAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        }}
      >
        <Pressable
          onPress={handleFocusUserLocation}
          className="flex-row items-center gap-2 bg-white dark:bg-slate-800 px-5 py-2.5 rounded-full shadow-lg border border-gray-200/90 dark:border-gray-700 active:scale-95"
        >
          <Ionicons name="navigate" size={18} color="#2563eb" />
          <Text className="text-slate-800 dark:text-slate-100 text-xs font-bold tracking-wide">
            Về giữa
          </Text>
        </Pressable>
      </Animated.View>

      <MissionNavigationBottomSheet
        ref={bottomSheetRef}
        durationText={durationText}
        distanceText={distanceText}
        etaTimeStr={etaTimeStr}
        displayAddress={displayAddress}
        displayContent={displayContent}
        displayEmergencyLevel={displayEmergencyLevel}
        displayPhone={displayPhone}
        distanceToTarget={
          remainingDistance > 0 && remainingDistance < distanceToTarget
            ? remainingDistance
            : distanceToTarget
        }
        canComplete={canComplete}
        isCompleting={isCompleting}
        isCanceling={isCanceling}
        onCancelMission={handleOpenCancelModal}
        onCompleteMission={() => handleCompleteMission(activeMission?.id)}
        onCallReporter={handleCallReporter}
      />

      <CancelMissionModal
        visible={isCancelModalVisible}
        loading={isCanceling}
        onDismiss={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
      />
    </ScreenContainer>
  );
}
