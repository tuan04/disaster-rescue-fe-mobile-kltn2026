import ScreenContainer from "@/components/common/ScreenContainer";
import UserLocationMarker from "@/components/map/UserLocationMarker";
import { MAP_STYLE_URL } from "@/contants/mapConfig";
import {
  extractRouteSteps,
  getNavigationProgress,
} from "@/helpers/navigation";
import {
  calculateEtaTime,
  formatDuration,
  formatRouteDistance,
} from "@/helpers/route";
import { useLocation } from "@/hooks/useLocation";
import { useRescue } from "@/hooks/useRescue";
import { useRoute } from "@/hooks/useRoute";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
} from "@maplibre/maplibre-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MissionNavigationScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
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
    clearRoute,
  } = useRoute({
    cameraRef,
    currentLat,
    currentLng,
  });

  const currentRouteGeoJSON = remainingRouteGeoJSON || routeGeoJSON;

  // Nghiệp vụ ca cứu hộ (hủy ca, hoàn thành ca)
  const { handleCancelMission, handleCompleteMission } = useRescue({
    clearRoute,
  });

  // Trích xuất các bước rẽ và tính toán trạng thái dẫn đường từng bước
  const routeSteps = useMemo(() => {
    return extractRouteSteps(activeRoute || activeMission?.route);
  }, [activeRoute, activeMission?.route]);

  const navProgress = useMemo(() => {
    return getNavigationProgress(routeSteps, currentLat, currentLng);
  }, [routeSteps, currentLat, currentLng]);

  // Tự động bám theo vị trí đội cứu hộ ở góc nhìn 3D dẫn đường
  const [isFollowingUser, setIsFollowingUser] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

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

  // Gọi điện thoại cho nạn nhân
  const handleCallReporter = useCallback(() => {
    if (activeMission?.reporter_phone) {
      Linking.openURL(`tel:${activeMission.reporter_phone}`).catch((err) => {
        Alert.alert("Lỗi", "Không thể thực hiện cuộc gọi: " + err.message);
      });
    }
  }, [activeMission?.reporter_phone]);

  const targetLat = activeMission?.target_latitude;
  const targetLng = activeMission?.target_longitude;
  const displayName =
    activeMission?.address?.split(",")?.[0]?.trim() || "Điểm cứu hộ";
  const routeDuration = activeRoute?.routes?.[0]?.duration;
  const routeDistance = activeRoute?.routes?.[0]?.distance;
  const distanceText = formatRouteDistance(routeDistance);
  const durationText = formatDuration(routeDuration);
  const etaTimeStr = calculateEtaTime(routeDuration);

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
        {currentRouteGeoJSON && (
          <GeoJSONSource
            id="navRouteSource"
            data={currentRouteGeoJSON}
          >
            <Layer
              id="navRouteCasing"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 10,
                "line-opacity": 0.4,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
            <Layer
              id="navRouteLine"
              type="line"
              paint={{
                "line-color": "#1d4ed8",
                "line-width": 8,
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
            />
          </GeoJSONSource>
        )}

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
          <Marker
            id="nav-target-location"
            lngLat={[targetLng, targetLat]}
            anchor="bottom"
          >
            <View className="items-center">
              {/* Capsule tên địa điểm / người cần cứu trợ */}
              <View className="bg-white dark:bg-slate-900 px-2.5 py-1 rounded-2xl mb-1 shadow-lg border border-slate-200 dark:border-slate-700 elevation-6">
                <Text
                  className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400"
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
              </View>

              {/* Pin đỏ Google Maps */}
              <View className="items-center justify-center shadow-lg elevation-6">
                <Ionicons name="location" size={38} color="#ef4444" />
                <View className="absolute top-[9px] w-2.5 h-2.5 rounded-full bg-white" />
              </View>
            </View>
          </Marker>
        )}
      </Map>

      {/* --- BẢNG DẪN ĐƯỜNG GOOGLE MAPS XANH LÁ Ở ĐỈNH MÀN HÌNH --- */}
      <View
        className="absolute left-3 right-3 z-20 shadow-2xl elevation-10"
        style={{ top: insets.top + 8 }}
      >
        {/* Khung chính: Mũi tên - Tên đường đang đi & khoảng cách */}
        <View className="bg-secondary rounded-3xl p-4 flex-row items-center justify-between shadow-2xl">
          {/* Mũi tên rẽ / đi thẳng to rõ */}
          <View className="w-12 items-center justify-center mr-2">
            <MaterialCommunityIcons
              name={navProgress.maneuverInfo?.iconName}
              size={35}
              color="#ffffff"
            />
          </View>

          {/* Tên đường đang đi & khoảng cách đến ngã rẽ tiếp theo */}
          <View className="flex-1 pr-2">
            <Text
              className="text-2xl font-black text-white leading-tight"
              numberOfLines={1}
            >
              {navProgress.currentStreetName || displayName}
            </Text>
            <Text
              className="text-xs font-semibold text-white/80 mt-0.5"
              numberOfLines={1}
            >
              {navProgress.distanceText ? `${navProgress.distanceText} • ` : ""}
              {navProgress.nextStep
                ? (navProgress.nextManeuverInfo?.instruction || "Đi thẳng")
                : (navProgress.maneuverInfo?.instruction || "Đi theo lộ trình")}
            </Text>
          </View>
        </View>

        {/* Khung con "Sau đó" gắn liền mép dưới bên trái */}
        {navProgress.nextManeuverInfo && (
          <View className="self-start bg-secondary rounded-b-2xl px-4 py-2 flex-row items-center gap-2 -mt-1.5 shadow-lg ml-4 border-t border-white/20">
            <Text className="text-white font-bold text-sm tracking-wide">
              Sau đó
            </Text>
            <MaterialCommunityIcons
              name={navProgress.nextManeuverInfo.iconName}
              size={20}
              color="#ffffff"
            />
            {navProgress.nextStep?.name ? (
              <Text
                className="text-white/95 text-xs font-semibold max-w-[180px]"
                numberOfLines={1}
              >
                {navProgress.nextStep.name}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {/* --- ĐỒNG HỒ TỐC ĐỘ THỰC TẾ BÊN DƯỚI GÓC TRÁI --- */}
      <View
        className="absolute left-4 z-10"
        style={{ bottom: insets.bottom + (isExpanded ? 245 : 95) }}
      >
        <View className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 items-center justify-center shadow-xl border border-gray-100 dark:border-gray-700">
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
        className="absolute self-center z-20"
        style={{
          bottom: insets.bottom + (isExpanded ? 245 : 95),
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
          className="flex-row items-center gap-2 bg-white dark:bg-slate-800 px-5 py-2.5 rounded-full shadow-2xl elevation-8 border border-gray-200/90 dark:border-gray-700 active:scale-95"
        >
          <Ionicons name="navigate" size={18} color="#2563eb" />
          <Text className="text-slate-800 dark:text-slate-100 text-xs font-bold tracking-wide">
            Về giữa
          </Text>
        </Pressable>
      </Animated.View>

      {/* --- BOTTOM SHEET DẪN ĐƯỜNG --- */}
      <View
        className="absolute left-0 right-0 bottom-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-gray-200/80 dark:border-gray-800 z-30"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        {/* Thanh gạt nhỏ ở đỉnh */}
        <Pressable
          onPress={() => setIsExpanded((prev) => !prev)}
          className="w-full items-center py-2 active:opacity-60"
        >
          <View className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" />
        </Pressable>

        {/* Hàng chính: Nút X — Thời gian & Cự ly — Nút Tuỳ chọn/Mở rộng */}
        <View className="flex-row items-center justify-between px-4 pb-2">
          {/* Nút X Huỷ ca */}
          <Pressable
            onPress={handleCancelMission}
            className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 items-center justify-center bg-white dark:bg-slate-800 active:scale-95 shadow-sm"
          >
            <Ionicons name="close" size={24} color={theme.colors.onSurface} />
          </Pressable>

          {/* Phần giữa: Thời gian to & Quãng đường / ETA */}
          <Pressable
            onPress={() => setIsExpanded((prev) => !prev)}
            className="flex-1 items-center justify-center px-2 active:opacity-80"
          >
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {durationText}
            </Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {distanceText} • {etaTimeStr}
            </Text>
          </Pressable>

          {/* Nút Tuỳ chọn lộ trình / Mở rộng */}
          <Pressable
            onPress={() => setIsExpanded((prev) => !prev)}
            className={`w-12 h-12 rounded-full border items-center justify-center active:scale-95 shadow-sm ${isExpanded
              ? "bg-blue-600 border-blue-500"
              : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
              }`}
          >
            <Ionicons
              name="git-branch-outline"
              size={22}
              color={isExpanded ? "#ffffff" : theme.colors.onSurface}
            />
          </Pressable>
        </View>

        {/* Phần chi tiết khi bấm mở rộng (Expanded) */}
        {isExpanded && (
          <View className="pt-2 border-t border-gray-100 dark:border-gray-800 px-4">
            <View className="mb-2.5">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Điểm đến cứu hộ
              </Text>
              <Text
                className="text-sm font-bold text-slate-800 dark:text-white mt-0.5"
                numberOfLines={2}
              >
                {activeMission?.address || "Điểm cứu hộ SOS"}
              </Text>
            </View>

            {activeMission?.reporter_phone && (
              <View className="flex-row items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl mb-3">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center">
                    <Ionicons name="call" size={16} color="#2563eb" />
                  </View>
                  <View>
                    <Text className="text-[10px] text-slate-400 font-medium">
                      Người gọi cứu hộ
                    </Text>
                    <Text className="text-xs font-bold text-slate-900 dark:text-white">
                      {activeMission.reporter_phone}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleCallReporter}
                  className="bg-emerald-600 active:bg-emerald-700 px-3.5 py-1.5 rounded-xl flex-row items-center gap-1 shadow-sm"
                >
                  <Ionicons name="call" size={13} color="#ffffff" />
                  <Text className="text-white text-xs font-bold">Gọi ngay</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={handleCompleteMission}
              className="bg-blue-600 active:bg-blue-700 py-3 rounded-2xl items-center justify-center shadow-md mb-1"
            >
              <Text className="text-sm font-bold text-white">
                Hoàn thành nhiệm vụ
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
