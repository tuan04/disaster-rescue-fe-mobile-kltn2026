import UserLocationMarker from "@/components/map/UserLocationMarker";
import { MAP_STYLE_URL } from "@/contants/mapConfig";
import {
  calculateEtaTime,
  getRemainingRouteCoordinates,
} from "@/helpers/route";
import { useActiveMission } from "@/hooks/useActiveMission";
import { useLocation } from "@/hooks/useLocation";
import { Ionicons } from "@expo/vector-icons";
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
} from "@maplibre/maplibre-react-native";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PIP_WIDTH = 145;
const PIP_HEIGHT = 195;

export default function FloatingMissionPiP() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const cameraRef = useRef<CameraRef>(null);

  const { hasActiveMission, activeMission } = useActiveMission();
  const { coords, heading } = useLocation();

  // Tính vị trí ban đầu nổi ở góc dưới bên phải
  const isTabBarVisible =
    pathname === "/" ||
    pathname === "/map" ||
    pathname === "/setting" ||
    pathname?.startsWith("/(app)");

  const initialX = SCREEN_WIDTH - PIP_WIDTH - 14;
  const initialY = isTabBarVisible
    ? SCREEN_HEIGHT - PIP_HEIGHT - (insets.bottom + 68)
    : SCREEN_HEIGHT - PIP_HEIGHT - (insets.bottom + 20);

  const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;
  const currentPos = useRef({ x: initialX, y: initialY });

  // PanResponder cho phép kéo thả di chuyển mượt mà khắp màn hình
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Chỉ nhận diện kéo khi di chuyển ngón tay > 6px để tránh chặn sự kiện click
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        const newX = currentPos.current.x + gestureState.dx;
        const newY = currentPos.current.y + gestureState.dy;

        // Giới hạn trong phạm vi an toàn của màn hình
        const minX = 8;
        const maxX = SCREEN_WIDTH - PIP_WIDTH - 8;
        const minY = insets.top + 10;
        const maxY = SCREEN_HEIGHT - PIP_HEIGHT - insets.bottom - 16;

        const clampedY = Math.max(minY, Math.min(maxY, newY));
        // Tự động hít (snap) về mép trái hoặc mép phải gần nhất (như Chat Heads / YouTube)
        const snapX = newX + PIP_WIDTH / 2 > SCREEN_WIDTH / 2 ? maxX : minX;

        Animated.spring(pan, {
          toValue: { x: snapX, y: clampedY },
          useNativeDriver: false,
          bounciness: 6,
          speed: 14,
        }).start();

        currentPos.current = { x: snapX, y: clampedY };

        // Nếu chỉ là một cú chạm nhẹ (không phải kéo), mở màn hình dẫn đường
        if (Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6) {
          router.push("/(pages)/mission-navigation");
        }
      },
    }),
  ).current;

  // Cập nhật camera khi tọa độ thay đổi
  useEffect(() => {
    if (coords && cameraRef.current) {
      cameraRef.current.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: 15,
        duration: 0,
      });
    }
  }, [coords.latitude, coords.longitude]);

  const lastNearestIndexRef = useRef<number>(0);

  useEffect(() => {
    lastNearestIndexRef.current = 0;
  }, [activeMission?.route]);

  // Chuẩn bị dữ liệu tuyến đường còn lại (GeoJSON)
  const routeGeoJSON = useMemo(() => {
    const geom = activeMission?.route?.routes?.[0]?.geometry;
    if (!geom || !geom.coordinates || geom.coordinates.length === 0) return null;

    if (!coords.latitude || !coords.longitude) {
      return {
        type: "Feature" as const,
        properties: {},
        geometry: {
          type: "LineString" as const,
          coordinates: geom.coordinates,
        },
      };
    }

    const { remainingCoordinates, nearestIndex } = getRemainingRouteCoordinates(
      geom.coordinates,
      coords.latitude,
      coords.longitude,
      lastNearestIndexRef.current,
    );

    lastNearestIndexRef.current = nearestIndex;

    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: remainingCoordinates,
      },
    };
  }, [activeMission?.route, coords.latitude, coords.longitude]);

  // Tính giờ dự kiến đến nơi (ETA clock: hh:mm)
  const etaTimeStr = useMemo(() => {
    const durationSec = activeMission?.route?.routes?.[0]?.duration;
    return calculateEtaTime(durationSec);
  }, [activeMission?.route]);

  // Không hiển thị nếu không có ca cứu hộ hoặc đang ở chính màn hình dẫn đường
  if (
    !hasActiveMission ||
    !activeMission ||
    pathname?.includes("mission-navigation")
  ) {
    return null;
  }

  // Tọa độ điểm nạn nhân
  const targetLat = activeMission.target_latitude;
  const targetLng = activeMission.target_longitude;

  // Tên hiển thị (địa chỉ hoặc tên nạn nhân)
  const displayName =
    activeMission.address?.split(",")?.[0]?.trim() || "Điểm cứu hộ";

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        pan.getLayout(),
        {
          position: "absolute",
          zIndex: 999,
          width: PIP_WIDTH,
          height: PIP_HEIGHT,
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: "#0b131e",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.6,
          shadowRadius: 10,
          elevation: 10,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.15)",
        },
      ]}
    >
      <View style={{ flex: 1, position: "relative" }}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Map
            style={StyleSheet.absoluteFillObject}
            mapStyle={MAP_STYLE_URL}
            attribution={false}
            logo={false}
            compass={false}
            dragPan={false}
            touchZoom={false}
            doubleTapZoom={false}
            doubleTapHoldZoom={false}
            touchRotate={false}
            touchPitch={false}
          >
            <Camera
              ref={cameraRef}
              initialViewState={{
                center: [coords.longitude, coords.latitude],
                zoom: 15,
              }}
            />

            {/* Tuyến đường dẫn đường */}
            {routeGeoJSON && (
              <GeoJSONSource id="pipRouteSource" data={routeGeoJSON}>
                <Layer
                  id="pipRouteCasing"
                  type="line"
                  paint={{
                    "line-color": "#0284c7",
                    "line-width": 6,
                    "line-opacity": 0.4,
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
                <Layer
                  id="pipRouteLine"
                  type="line"
                  paint={{
                    "line-color": "#00f0ff",
                    "line-width": 3.5,
                  }}
                  layout={{
                    "line-cap": "round",
                    "line-join": "round",
                  }}
                />
              </GeoJSONSource>
            )}

            {/* Marker SOS điểm nạn nhân */}
            {targetLat && targetLng && (
              <Marker id="pipTargetMarker" lngLat={[targetLng, targetLat]}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#ef4444",
                    borderWidth: 2,
                    borderColor: "#ffffff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 3.5,
                      backgroundColor: "#7f1d1d",
                    }}
                  />
                </View>
              </Marker>
            )}

            {/* Marker Vị trí đội cứu hộ */}
            <UserLocationMarker
              id="pipUserMarker"
              latitude={coords.latitude}
              longitude={coords.longitude}
              heading={heading}
              coneSize={60}
              dotSize={16}
            />
          </Map>
        </View>

        {/* Lớp phủ bấm vào bản đồ để mở màn hình dẫn đường */}
        <Pressable
          onPress={() => router.push("/(pages)/mission-navigation")}
          style={StyleSheet.absoluteFillObject}
          className="active:opacity-90"
        />
      </View>

      <Pressable
        onPress={() => router.push("/(pages)/mission-navigation")}
        className="bg-secondary active:opacity-90 px-2.5 py-1.5 flex-row items-center"
      >
        <Ionicons
          name="arrow-up"
          size={18}
          color="#ffffff"
          style={{ marginRight: 6 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 13,
              fontWeight: "700",
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={{
              color: "#a7f3d0",
              fontSize: 11,
              fontWeight: "500",
              marginTop: 1,
            }}
          >
            {etaTimeStr}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
