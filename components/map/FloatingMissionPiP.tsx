import { useAppTheme } from "@/contants/theme";
import {
  extractRouteSteps,
  getManeuverInfo,
} from "@/helpers/navigation";
import { calculateEtaTime, formatRouteDistance } from "@/helpers/route";
import { useActiveMission } from "@/hooks/useActiveMission";
import { useUserCoordinates } from "@/hooks/useLocation";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PIP_WIDTH = 216;
const PIP_HEIGHT = 60;

/**
 * FloatingMissionPiP (Navigation HUD Capsule)
 * Widget nổi siêu nhẹ theo dõi ca cứu hộ đang active.
 * Cho phép kéo thả tự do, tự snap vào mép màn hình, không render MapLibre ngầm giúp tiết kiệm tối đa RAM/GPU.
 */
export default function FloatingMissionPiP() {
  const theme = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const { hasActiveMission, activeMission } = useActiveMission();
  const coords = useUserCoordinates();

  // Vị trí ban đầu nổi ở góc dưới bên phải
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
        const minX = 10;
        const maxX = SCREEN_WIDTH - PIP_WIDTH - 10;
        const minY = insets.top + 10;
        const maxY = SCREEN_HEIGHT - PIP_HEIGHT - insets.bottom - 16;

        const clampedY = Math.max(minY, Math.min(maxY, newY));
        // Tự động hít (snap) về mép trái hoặc mép phải gần nhất
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

  // Tính thông tin điều hướng (hướng rẽ, khoảng cách, ETA)
  const navSummary = useMemo(() => {
    if (!activeMission?.route) return null;

    const steps = extractRouteSteps(activeMission.route);
    const firstStep = steps[0];
    const maneuver = firstStep
      ? getManeuverInfo(firstStep)
      : { iconName: "navigation" as const, shortAction: "Đang dẫn đường" };

    const totalDistance =
      activeMission.route.routes?.[0]?.legs?.[0]?.distance?.value;
    const distanceText =
      typeof totalDistance === "number"
        ? formatRouteDistance(totalDistance)
        : "";

    const durationSec =
      activeMission.route.routes?.[0]?.legs?.[0]?.duration?.value;
    const etaText = calculateEtaTime(durationSec);

    return {
      iconName: maneuver.iconName,
      shortAction: maneuver.shortAction,
      distanceText,
      etaText,
    };
  }, [activeMission?.route]);

  // Chỉ ẩn khi không có ca cứu hộ hoặc đang ở chính màn hình dẫn đường chuyên dụng
  const isNavScreen = pathname?.includes("mission-navigation");

  if (!hasActiveMission || !activeMission || isNavScreen) {
    return null;
  }

  // Tên hiển thị (địa chỉ hoặc tên điểm cứu hộ)
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
          borderRadius: 20,
          backgroundColor: theme.colors.surface,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.dark ? 0.4 : 0.15,
          shadowRadius: 8,
          elevation: 8,
          borderWidth: 1,
          borderColor: theme.colors.outline,
          overflow: "hidden",
        },
      ]}
    >
      <Pressable
        onPress={() => router.push("/(pages)/mission-navigation")}
        className="flex-1 flex-row items-center px-3 py-1.5 active:opacity-90"
      >
        {/* Khung icon điều hướng nổi bật bằng Tailwind */}
        <View className="w-9 h-9 rounded-full bg-secondary/15 border border-secondary/40 items-center justify-center mr-2.5">
          <MaterialCommunityIcons
            name={navSummary?.iconName || "navigation"}
            size={20}
            color={theme.colors.secondary}
          />
        </View>

        {/* Nội dung thông tin ca cứu hộ sử dụng Tailwind */}
        <View className="flex-1 justify-center">
          <Text
            numberOfLines={1}
            className="text-text text-[13px] font-bold"
          >
            {displayName}
          </Text>
          <View className="flex-row items-center mt-0.5">
            {navSummary?.etaText ? (
              <Text className="text-secondary text-[11px] font-semibold">
                {navSummary.etaText}
              </Text>
            ) : null}
            {navSummary?.distanceText ? (
              <Text className="text-text-muted text-[11px] font-medium ml-1.5">
                • {navSummary.distanceText}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
