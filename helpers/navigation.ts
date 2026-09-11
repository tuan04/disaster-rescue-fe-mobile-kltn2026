import { calculateDistanceMeters, formatRouteDistance } from "@/helpers/route";
import type { RouteResponse, StepDto } from "@/types/map";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export { calculateDistanceMeters };

export interface ManeuverInfo {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  shortAction: string;
}

export interface NavigationState {
  currentStep: StepDto | null;
  nextStep: StepDto | null;
  currentStreetName: string;
  distanceToManeuver: number;
  distanceText: string;
  primaryManeuver: {
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    streetName: string;
    actionText?: string;
  };
  secondaryManeuver: {
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
    streetName: string;
    actionText?: string;
  } | null;
  showSecondary: boolean;
  isNearManeuver: boolean;
  currentStepIndex: number;
  totalSteps: number;
}

const THRESHOLD_NEAR_MANEUVER = 300;

/**
 * Trích xuất danh sách phẳng các bước rẽ (steps) từ dữ liệu RouteResponse
 */
export function extractRouteSteps(route?: RouteResponse | null): StepDto[] {
  return route?.routes?.[0]?.legs?.flatMap((leg) => leg.steps || []) || [];
}

/**
 * Ánh xạ thao tác lái xe (maneuver) sang icon MaterialCommunityIcons và hành động ngắn
 */
export function getManeuverInfo(step: StepDto): ManeuverInfo {
  const type = step.maneuver?.type?.toLowerCase() || "";
  const modifier = step.maneuver?.modifier?.toLowerCase() || "";

  if (type === "arrive")
    return { iconName: "flag-checkered", shortAction: "Đến nơi" };
  if (type === "depart")
    return { iconName: "arrow-up", shortAction: "Xuất phát" };
  if (modifier.includes("uturn"))
    return { iconName: "arrow-u-left-top-bold", shortAction: "Quay đầu" };
  if (modifier.includes("sharp left") || modifier === "left")
    return { iconName: "arrow-left-top", shortAction: "Rẽ trái" };
  if (modifier.includes("slight left"))
    return { iconName: "arrow-top-left-thick", shortAction: "Chếch trái" };
  if (modifier.includes("sharp right") || modifier === "right")
    return { iconName: "arrow-right-top", shortAction: "Rẽ phải" };
  if (modifier.includes("slight right"))
    return { iconName: "arrow-top-right-thick", shortAction: "Chếch phải" };
  if (type === "roundabout" || type === "rotary")
    return { iconName: "rotate-left", shortAction: "Vào bùng binh" };
  if (type === "fork") {
    const isLeft = modifier.includes("left");
    return {
      iconName: isLeft ? "arrow-top-left-thick" : "arrow-top-right-thick",
      shortAction: `Nhánh ${isLeft ? "trái" : "phải"}`,
    };
  }

  return { iconName: "arrow-up", shortAction: "Đi thẳng" };
}

/**
 * Tính khoảng cách từ điểm GPS hiện tại đến một đoạn thẳng tọa độ (segment)
 */
function distanceToSegmentMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dAB2 = (bLat - aLat) ** 2 + (bLng - aLng) ** 2;
  if (dAB2 === 0) return calculateDistanceMeters(pLat, pLng, aLat, aLng);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) / dAB2,
    ),
  );
  return calculateDistanceMeters(
    pLat,
    pLng,
    aLat + t * (bLat - aLat),
    aLng + t * (bLng - aLng),
  );
}

export function getNavigationProgress(
  steps: StepDto[],
  currentLat: number,
  currentLng: number,
  savedStepIndex: number = 0,
): NavigationState {
  if (!steps || steps.length === 0) {
    return {
      currentStep: null,
      nextStep: null,
      currentStreetName: "Đoạn đường hiện tại",
      distanceToManeuver: 0,
      distanceText: "",
      primaryManeuver: {
        iconName: "arrow-up",
        streetName: "Đoạn đường hiện tại",
        actionText: "Đi thẳng",
      },
      secondaryManeuver: null,
      showSecondary: false,
      isNearManeuver: false,
      currentStepIndex: 0,
      totalSteps: 0,
    };
  }

  const hasGps = Boolean(currentLat && currentLng);
  let activeIndex =
    savedStepIndex >= 0 && savedStepIndex < steps.length ? savedStepIndex : 0;

  if (hasGps) {
    // 1. Tìm segment gần vị trí xe nhất
    let bestIndex = activeIndex;
    let minSegmentDist = Infinity;

    for (let i = 0; i < steps.length - 1; i++) {
      const s1 = steps[i]?.maneuver?.location;
      const s2 = steps[i + 1]?.maneuver?.location;
      if (s1 && s2) {
        const segDist = distanceToSegmentMeters(
          currentLat,
          currentLng,
          s1[1],
          s1[0],
          s2[1],
          s2[0],
        );
        if (segDist < minSegmentDist) {
          minSegmentDist = segDist;
          bestIndex = i;
        }
      }
    }

    if (minSegmentDist < 35 && bestIndex >= savedStepIndex) {
      activeIndex = bestIndex;
    }

    // 2. Chuyển sang bước tiếp theo nếu xe đã đến/qua ngã rẽ (< 15m)
    while (activeIndex < steps.length - 1) {
      const turnLoc = steps[activeIndex + 1]?.maneuver?.location;
      if (!turnLoc) break;
      const distToTurn = calculateDistanceMeters(
        currentLat,
        currentLng,
        turnLoc[1],
        turnLoc[0],
      );
      if (distToTurn < 15 && activeIndex + 1 < steps.length) {
        activeIndex++;
      } else {
        break;
      }
    }
  }

  const currentStep = steps[activeIndex];
  const nextStep =
    activeIndex + 1 < steps.length ? steps[activeIndex + 1] : null;

  // 3. Tính khoảng cách đếm ngược đến ngã rẽ tiếp theo
  let distanceToManeuver = currentStep?.distance ?? 0;
  if (hasGps) {
    const targetLoc =
      nextStep?.maneuver?.location || currentStep?.maneuver?.location;
    if (targetLoc) {
      distanceToManeuver = calculateDistanceMeters(
        currentLat,
        currentLng,
        targetLoc[1],
        targetLoc[0],
      );
    }
  }
  distanceToManeuver = Math.max(0, distanceToManeuver);

  const currentStreetName =
    currentStep?.name?.trim() ||
    (currentStep?.maneuver?.type === "arrive"
      ? "Vị trí cứu nạn"
      : "Đoạn đường bắt đầu");
  const nextStreetName =
    nextStep?.name?.trim() ||
    (nextStep?.maneuver?.type === "arrive"
      ? "Vị trí người cần cứu nạn"
      : "Đoạn tiếp theo");
  const nextManeuverInfo = nextStep ? getManeuverInfo(nextStep) : null;

  // 4. Kiểm tra ngưỡng 300m (bỏ qua tại điểm khởi hành depart nếu xe chưa di chuyển >= 15m)
  let isNearManeuver = hasGps && distanceToManeuver <= THRESHOLD_NEAR_MANEUVER;
  if (
    isNearManeuver &&
    activeIndex === 0 &&
    currentStep?.maneuver?.type === "depart" &&
    currentStep?.maneuver?.location
  ) {
    const [departLng, departLat] = currentStep.maneuver.location;
    if (
      calculateDistanceMeters(currentLat, currentLng, departLat, departLng) < 15
    ) {
      isNearManeuver = false;
    }
  }

  // 5. Cấu hình hiển thị ô chính & ô phụ
  const secondaryManeuver: NavigationState["secondaryManeuver"] = nextStep
    ? {
        iconName: nextManeuverInfo?.iconName || "arrow-up",
        streetName: nextStreetName,
        actionText: nextManeuverInfo?.shortAction,
      }
    : null;

  const primaryManeuver: NavigationState["primaryManeuver"] = !nextStep
    ? {
        iconName: currentStep
          ? getManeuverInfo(currentStep).iconName
          : "flag-checkered",
        streetName: currentStreetName,
        actionText: "Đến nơi",
      }
    : isNearManeuver && secondaryManeuver
      ? secondaryManeuver
      : {
          iconName: "arrow-up",
          streetName: currentStreetName,
          actionText: "Đi thẳng",
        };

  return {
    currentStep,
    nextStep,
    currentStreetName,
    distanceToManeuver,
    distanceText: formatRouteDistance(distanceToManeuver),
    primaryManeuver,
    secondaryManeuver,
    showSecondary: !isNearManeuver && nextStep !== null,
    isNearManeuver,
    currentStepIndex: activeIndex,
    totalSteps: steps.length,
  };
}
