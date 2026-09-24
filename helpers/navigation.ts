import { calculateDistanceMeters, formatRouteDistance } from "@/helpers/route";
import type { RouteResponse, StepDto } from "@/types/map";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { MANEUVER_MAP, type ManeuverInfo } from "@/constants/navigation";

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

export function stripHtmlTags(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractRouteSteps(route?: RouteResponse | null): StepDto[] {
  return route?.routes?.[0]?.legs?.flatMap((leg) => leg.steps || []) || [];
}

export function extractCleanStreetName(html?: string | null): string {
  const clean = stripHtmlTags(html);
  if (!clean) return "Đoạn đường hiện tại";

  const prefixes = [
    /^(rẽ trái vào|rẽ phải vào|rẽ vào|đi vào|hướng vào)\s+/i,
    /^(bắt đầu đi từ|bắt đầu từ|đi từ|xuất phát từ)\s+/i,
    /^(chếch sang trái vào|chếch sang phải vào|nhập vào)\s+/i,
  ];

  for (const regex of prefixes) {
    if (regex.test(clean)) {
      return clean.replace(regex, "").trim();
    }
  }

  if (clean.includes("đến điểm đích") || clean.includes("đã đến")) {
    return "Vị trí cứu nạn";
  }

  return clean;
}

export function getManeuverInfo(step: StepDto): ManeuverInfo {
  const m = (step.maneuver || "").toLowerCase().trim();
  const text = (step.html_instructions || "").toLowerCase();

  if (
    m === "arrive" ||
    text.includes("đến điểm đích") ||
    text.includes("đã đến") ||
    step.distance?.value === 0
  ) {
    return MANEUVER_MAP.arrive;
  }

  if (m === "depart" || text.includes("bắt đầu") || text.includes("khởi hành")) {
    return MANEUVER_MAP.depart;
  }

  if (MANEUVER_MAP[m]) {
    return MANEUVER_MAP[m];
  }

  if (m.includes("left") || text.includes("rẽ trái")) return MANEUVER_MAP.left;
  if (m.includes("right") || text.includes("rẽ phải")) return MANEUVER_MAP.right;
  if (m.includes("straight") || text.includes("đi thẳng")) return MANEUVER_MAP.straight;

  return MANEUVER_MAP.straight;
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
    // 1. Tìm segment gần vị trí xe nhất (duyệt toàn bộ steps qua start_location và end_location)
    let bestIndex = activeIndex;
    let minSegmentDist = Infinity;

    for (let i = 0; i < steps.length; i++) {
      const s1 = steps[i]?.start_location;
      const s2 = steps[i]?.end_location || steps[i + 1]?.start_location;
      if (s1 && s2) {
        const segDist = distanceToSegmentMeters(
          currentLat,
          currentLng,
          s1.lat,
          s1.lng,
          s2.lat,
          s2.lng,
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

    // 2. Chuyển sang bước tiếp theo nếu xe đã đến/qua ngã rẽ (< 18m)
    while (activeIndex < steps.length - 1) {
      const turnLoc =
        steps[activeIndex + 1]?.start_location ||
        steps[activeIndex]?.end_location;
      if (!turnLoc) break;
      const distToTurn = calculateDistanceMeters(
        currentLat,
        currentLng,
        turnLoc.lat,
        turnLoc.lng,
      );
      if (distToTurn < 18 && activeIndex + 1 < steps.length) {
        activeIndex++;
      } else {
        break;
      }
    }
  }

  const currentStep = steps[activeIndex];
  const nextStep =
    activeIndex + 1 < steps.length ? steps[activeIndex + 1] : null;

  // 3. Tính khoảng cách đếm ngược đến ngã rẽ tiếp theo (hoặc đến đích nếu là bước cuối)
  let distanceToManeuver = currentStep?.distance?.value ?? 0;
  if (hasGps) {
    const targetLoc =
      nextStep?.start_location ||
      currentStep?.end_location ||
      currentStep?.start_location;
    if (targetLoc) {
      distanceToManeuver = calculateDistanceMeters(
        currentLat,
        currentLng,
        targetLoc.lat,
        targetLoc.lng,
      );
    }
  }
  distanceToManeuver = Math.max(0, distanceToManeuver);

  const currentStreetName =
    extractCleanStreetName(currentStep?.html_instructions);
  const nextStreetName =
    extractCleanStreetName(nextStep?.html_instructions);
  const nextManeuverInfo = nextStep ? getManeuverInfo(nextStep) : null;

  // 4. Kiểm tra ngưỡng 300m (bỏ qua tại điểm khởi hành nếu xe chưa di chuyển >= 15m)
  let isNearManeuver = hasGps && distanceToManeuver <= THRESHOLD_NEAR_MANEUVER;
  if (
    isNearManeuver &&
    activeIndex === 0 &&
    currentStep?.start_location
  ) {
    if (
      calculateDistanceMeters(
        currentLat,
        currentLng,
        currentStep.start_location.lat,
        currentStep.start_location.lng,
      ) < 15
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
