import ScreenContainer from "@/components/common/ScreenContainer";
import RescueTeamMarker from "@/components/map/RescueTeamMarker";
import RoutePolyline from "@/components/map/RoutePolyline";
import SheetDetailRow from "@/components/map/SheetDetailRow";
import TargetPointMarker from "@/components/map/TargetPointMarker";
import { MAP_STYLE_URL } from "@/contants/mapConfig";
import { makePhoneCall } from "@/helpers/phone";
import { getCoordinatesBounds } from "@/helpers/route";
import { useRescueTracking } from "@/hooks/useRescueTracking";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  Camera,
  type CameraRef,
  Map,
} from "@maplibre/maplibre-react-native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const vehicleIcon = require("@/assets/map-icons/sos_transportation.png");

export default function RescueTeamTrackingScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef>(null);

  // Nhận params từ router: requestId, targetLat, targetLng
  const params = useLocalSearchParams<{
    requestId?: string;
    targetLat?: string;
    targetLng?: string;
  }>();

  const requestId = params.requestId;
  const targetLat =
    params.targetLat && Number.isFinite(parseFloat(params.targetLat))
      ? parseFloat(params.targetLat)
      : null;
  const targetLng =
    params.targetLng && Number.isFinite(parseFloat(params.targetLng))
      ? parseFloat(params.targetLng)
      : null;

  // Hook theo dõi thời gian thực
  const {
    assignment,
    teamLocation,
    currentStatus,
    isLoading,
    distanceText,
    durationText,
    routeGeoJSON,
  } = useRescueTracking({
    requestId,
    targetLat,
    targetLng,
  });

  const isWaitingForTeam = currentStatus === "PENDING" || !assignment;

  const hasExitedRef = useRef(false);

  // Tự động đóng màn hình khi ca cứu hộ bị hủy hoặc đã hoàn thành
  useEffect(() => {
    if (hasExitedRef.current) return;

    if (currentStatus === "CANCELED" || currentStatus === "CANCELLED") {
      hasExitedRef.current = true;
      Alert.alert(
        "Ca cứu hộ đã bị hủy",
        "Ca cứu hộ này đã được hủy bởi đội cứu hộ hoặc điều phối viên.",
        [{ text: "Đóng" }],
      );
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(app)");
      }
      return;
    }

    if (currentStatus === "COMPLETED" || currentStatus === "SAFE") {
      hasExitedRef.current = true;
      Alert.alert(
        "Nhiệm vụ cứu hộ hoàn thành",
        "Đội cứu hộ đã hoàn thành nhiệm vụ và xác nhận an toàn.",
        [{ text: "Đồng ý" }],
      );
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(app)");
      }
    }
  }, [currentStatus]);

  const [isFollowingTeam, setIsFollowingTeam] = useState<boolean>(true);
  const isFlyingRef = useRef<boolean>(false);

  // Căn chỉnh Camera khi mới vào hoặc khi bấm "Xem toàn cảnh"
  const handleFitBoundsAll = useCallback(() => {
    if (!cameraRef.current) return;

    const coordsList: number[][] = [];
    if (targetLng !== null && targetLat !== null) {
      coordsList.push([targetLng, targetLat]);
    }
    if (teamLocation?.longitude && teamLocation?.latitude) {
      coordsList.push([teamLocation.longitude, teamLocation.latitude]);
    }

    if (coordsList.length >= 2) {
      const bounds = getCoordinatesBounds(coordsList);
      if (bounds) {
        setIsFollowingTeam(false);
        isFlyingRef.current = true;
        cameraRef.current.setStop({
          bounds,
          pitch: 0,
          bearing: 0,
          padding: {
            top: insets.top + 80,
            left: 50,
            bottom: isWaitingForTeam ? insets.bottom + 120 : insets.bottom + 260,
            right: 50,
          },
          duration: 800,
        });
        setTimeout(() => {
          isFlyingRef.current = false;
        }, 850);
        return;
      }
    }

    // Fallback nếu chỉ có 1 tọa độ
    const centerLng = teamLocation?.longitude || targetLng || 106.66;
    const centerLat = teamLocation?.latitude || targetLat || 10.76;
    setIsFollowingTeam(false);
    isFlyingRef.current = true;
    cameraRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom: 15,
      pitch: 0,
      bearing: 0,
      duration: 800,
    });
    setTimeout(() => {
      isFlyingRef.current = false;
    }, 850);
  }, [
    targetLat,
    targetLng,
    teamLocation?.latitude,
    teamLocation?.longitude,
    insets.top,
    insets.bottom,
    isWaitingForTeam,
  ]);

  // Lần đầu tải dữ liệu xong tự động fit camera để nhìn thấy cả 2 điểm
  const initialFitDoneRef = useRef(false);
  useEffect(() => {
    if (initialFitDoneRef.current) return;
    if (
      (targetLat && targetLng && teamLocation?.latitude) ||
      (targetLat && targetLng && assignment)
    ) {
      initialFitDoneRef.current = true;
      setTimeout(() => {
        handleFitBoundsAll();
      }, 600);
    }
  }, [targetLat, targetLng, teamLocation?.latitude, assignment, handleFitBoundsAll]);

  // Tự động di chuyển camera bám theo xe cứu hộ nếu đang bật chế độ isFollowingTeam
  useEffect(() => {
    if (!cameraRef.current || !teamLocation || !isFollowingTeam || isFlyingRef.current) {
      return;
    }

    cameraRef.current.setStop({
      center: [teamLocation.longitude, teamLocation.latitude],
      zoom: 16,
      pitch: 45,
      bearing: teamLocation.heading || 0,
      duration: 350,
      padding: {
        top: insets.top + 70,
        bottom: insets.bottom + 260,
        left: 20,
        right: 20,
      },
    });
  }, [teamLocation, isFollowingTeam, insets.top, insets.bottom]);


  // Ưu tiên góc bám theo xe cứu hộ, nếu chưa có xe thì căn chỉnh về điểm cứu hộ
  const handleRecenter = useCallback(() => {
    if (!cameraRef.current) return;

    if (teamLocation?.longitude && teamLocation?.latitude) {
      setIsFollowingTeam(true);
      isFlyingRef.current = true;
      cameraRef.current.flyTo({
        center: [teamLocation.longitude, teamLocation.latitude],
        zoom: 16,
        pitch: 45,
        bearing: teamLocation.heading || 0,
        duration: 800,
      });
      setTimeout(() => {
        isFlyingRef.current = false;
      }, 850);
      return;
    }

    // Nếu chưa có vị trí đội cứu hộ thì đưa camera về điểm cứu hộ của người dân
    if (targetLng !== null && targetLat !== null) {
      setIsFollowingTeam(false);
      isFlyingRef.current = true;
      cameraRef.current.flyTo({
        center: [targetLng, targetLat],
        zoom: 15,
        pitch: 0,
        bearing: 0,
        duration: 800,
      });
      setTimeout(() => {
        isFlyingRef.current = false;
      }, 850);
    }
  }, [teamLocation, targetLat, targetLng]);

  const handleCallLeader = useCallback(() => {
    if (assignment?.leaderPhone) {
      makePhoneCall(assignment.leaderPhone);
    }
  }, [assignment?.leaderPhone]);

  const teamName =
    assignment?.assignedTeamName ||
    (isLoading ? "Đang tải dữ liệu..." : "Đang tìm đội cứu hộ gần nhất...");
  const leaderPhone = assignment?.leaderPhone || "";

  return (
    <ScreenContainer isEdgeToEdge={true} className="flex-1 bg-slate-100 dark:bg-slate-900">
      {/* 1. Bản đồ tương tác MapLibre */}
      <Map
        style={StyleSheet.absoluteFillObject}
        mapStyle={MAP_STYLE_URL}
        attribution={false}
        logo={false}
        onTouchMove={() => {
          if (isFollowingTeam) {
            setIsFollowingTeam(false);
          }
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [targetLng || 106.66, targetLat || 10.76],
            zoom: 14,
          }}
        />

        {/* Tuyến đường Polyline */}
        <RoutePolyline id="trackingRoute" data={routeGeoJSON} />

        {/* Marker Điểm cứu hộ của người dân */}
        {targetLat !== null && targetLng !== null && (
          <TargetPointMarker
            id="citizen-sos-target-marker"
            latitude={targetLat}
            longitude={targetLng}
          />
        )}

        {/* Marker Đội cứu hộ (di chuyển thời gian thực) */}
        {teamLocation && (
          <RescueTeamMarker
            latitude={teamLocation.latitude}
            longitude={teamLocation.longitude}
            heading={teamLocation.heading}
            teamName={teamName}
            speed={teamLocation.speed}
          />
        )}
      </Map>

      {/* 2. Thanh tiêu đề phía trên (Top Header Floating) */}
      <View
        className="absolute left-4 right-4 z-20 flex-row items-center justify-between"
        style={{ top: insets.top + 8 }}
      >
        {/* Nút quay lại */}
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white/95 dark:bg-slate-800/95 shadow-lg border border-slate-200 dark:border-slate-700 active:opacity-75"
        >
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </Pressable>
      </View>

      {/* Container chung ở đáy màn hình: Quản lý khoảng cách giữa nút định vị và bảng thông tin */}
      <View
        pointerEvents="box-none"
        className="absolute left-3 right-3 z-30"
        style={{ bottom: insets.bottom + 8 }}
      >
        {/* Nút định vị nổi: Ưu tiên bám theo xe, nếu chưa có xe thì bám theo điểm cứu hộ */}
        {!isFollowingTeam && (
          <View pointerEvents="box-none" className="items-end mb-2.5 mr-1">
            <Pressable
              onPress={handleRecenter}
              className="h-11 w-11 items-center justify-center rounded-full bg-secondary shadow-xl active:opacity-85"
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#ffffff" />
            </Pressable>
          </View>
        )}

        {/* Khối thông tin: Đang tìm đội cứu hộ hoặc Đội cứu hộ đang đến */}
        <View className="rounded-md bg-white dark:bg-slate-900 overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
          {isWaitingForTeam ? (
            <View className="flex-row items-center px-3 py-3">
              <Image
                source={vehicleIcon}
                className="w-10 h-10 mr-3"
                resizeMode="contain"
              />
              <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Đang tìm đội cứu hộ...
              </Text>
            </View>
          ) : (
            <>
              <View className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3 border-slate-100 dark:border-slate-800">
                <View className="flex-row items-start justify-between">
                  <Text className="text-sm font-bold text-slate-900 dark:text-slate-100 flex-1 pr-3 leading-snug">
                    Đội cứu hộ đang trên đường tới
                  </Text>
                  <View className="items-end shrink-0">
                    <Text className="text-sm font-extrabold text-blue-600 dark:text-blue-400">
                      {durationText}
                    </Text>
                    <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                      {distanceText || "--"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. Phần thông tin: Sử dụng SheetDetailRow */}
              <View className="px-4 py-1">
                <SheetDetailRow label="Đội" value={teamName} />
                <SheetDetailRow
                  label="Đội trưởng"
                  value={assignment?.leaderName || "Chưa cập nhật"}
                />
                <SheetDetailRow
                  label="Số điện thoại"
                  value={leaderPhone || "Chưa cập nhật"}
                />
              </View>

              {/* 3. Input text không bấm được và nút gọi màu xanh nhỏ bên phải */}
              <View className="flex-row items-center px-4 pb-4 pt-2">
                <TextInput
                  editable={false}
                  pointerEvents="none"
                  placeholder="Nhập tin nhắn..."
                  placeholderTextColor="#94a3b8"
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 text-sm"
                />
                <Pressable
                  onPress={handleCallLeader}
                  disabled={!leaderPhone}
                  className={`ml-2.5 h-10 w-10 items-center justify-center rounded-md shadow-sm ${leaderPhone
                    ? "bg-emerald-500 active:bg-emerald-600"
                    : "bg-slate-300 dark:bg-slate-700 opacity-60"
                    }`}
                >
                  <Ionicons name="call" size={18} color="#ffffff" />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
