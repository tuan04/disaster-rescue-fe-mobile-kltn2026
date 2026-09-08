import { calculateDistanceMeters, formatRouteDistance } from "@/helpers/route";
import type { RouteResponse, StepDto } from "@/types/map";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export { calculateDistanceMeters };

export interface ManeuverInfo {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  instruction: string;
  shortAction: string;
}

/**
 * Trích xuất danh sách phẳng các bước rẽ (steps) từ dữ liệu RouteResponse
 */
export function extractRouteSteps(route?: RouteResponse | null): StepDto[] {
  if (!route || !route.routes || route.routes.length === 0) return [];
  const primaryRoute = route.routes[0];
  if (!primaryRoute.legs || primaryRoute.legs.length === 0) return [];

  return primaryRoute.legs.flatMap((leg) => leg.steps || []);
}

/**
 * Ánh xạ thao tác lái xe (maneuver) từ OSRM sang Icon mũi tên MaterialCommunityIcons và câu lệnh tiếng Việt
 */
export function getManeuverInfo(step: StepDto): ManeuverInfo {
  const type = step.maneuver?.type?.toLowerCase() || "";
  const modifier = step.maneuver?.modifier?.toLowerCase() || "";
  const streetName = step.name?.trim() ? `vào ${step.name.trim()}` : "";

  if (type === "arrive") {
    return {
      iconName: "flag-checkered",
      instruction: "Đến vị trí người cần cứu nạn",
      shortAction: "Đến nơi",
    };
  }

  if (modifier.includes("left")) {
    return {
      iconName: "arrow-left-top",
      instruction: `Rẽ trái ${streetName}`.trim(),
      shortAction: "Rẽ trái",
    };
  }

  if (
    modifier.includes("sharp right") ||
    modifier.includes("slight right") ||
    modifier.includes("right")
  ) {
    return {
      iconName: "arrow-right-top",
      instruction: `Rẽ phải ${streetName}`.trim(),
      shortAction: "Rẽ phải",
    };
  }

  if (modifier.includes("uturn")) {
    return {
      iconName: "arrow-u-left-top-bold",
      instruction: `Quay đầu xe ${streetName}`.trim(),
      shortAction: "Quay đầu",
    };
  }

  if (type === "roundabout" || type === "rotary") {
    return {
      iconName: "rotate-left",
      instruction: `Đi vào bùng binh ${streetName}`.trim(),
      shortAction: "Vào bùng binh",
    };
  }

  if (type === "fork") {
    const isLeft = modifier.includes("left");
    return {
      iconName: isLeft ? "arrow-top-left-thick" : "arrow-top-right-thick",
      instruction:
        `Đi vào nhánh ${isLeft ? "trái" : "phải"} ${streetName}`.trim(),
      shortAction: `Nhánh ${isLeft ? "trái" : "phải"}`,
    };
  }

  // Đi thẳng, xuất phát hoặc mặc định: DÙNG MŨI TÊN ĐI THẲNG arrow-up-thick
  return {
    iconName: "arrow-up",
    instruction: step.name?.trim()
      ? `Đi thẳng theo ${step.name.trim()}`
      : "Đi thẳng theo lộ trình",
    shortAction: "Đi thẳng",
  };
}

export interface NavigationState {
  currentStep: StepDto | null;
  nextStep: StepDto | null;
  currentStreetName: string; // Tên con đường đang đi
  distanceToManeuver: number;
  distanceText: string;
  maneuverInfo: ManeuverInfo | null;
  nextManeuverInfo: ManeuverInfo | null;
  currentStepIndex: number;
  totalSteps: number;
}

/**
 * Xác định bước rẽ hiện tại dựa trên GPS của xe và danh sách các bước OSRM
 */
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
      maneuverInfo: {
        iconName: "arrow-up-thick",
        instruction: "Đi thẳng theo lộ trình",
        shortAction: "Đi thẳng",
      },
      nextManeuverInfo: {
        iconName: "arrow-left-top",
        instruction: "Sau đó rẽ vào điểm cứu hộ",
        shortAction: "Rẽ trái",
      },
      currentStepIndex: 0,
      totalSteps: 0,
    };
  }

  // Khi chưa có tọa độ GPS hợp lệ
  if (!currentLat || !currentLng || (currentLat === 0 && currentLng === 0)) {
    const currentStep = steps[0];
    const nextStep = steps.length > 1 ? steps[1] : null;
    return {
      currentStep,
      nextStep,
      currentStreetName: currentStep?.name?.trim() || "Đoạn đường hiện tại",
      distanceToManeuver: currentStep?.distance ?? 0,
      distanceText: formatRouteDistance(currentStep?.distance ?? 0),
      maneuverInfo: currentStep ? getManeuverInfo(currentStep) : null,
      nextManeuverInfo: nextStep ? getManeuverInfo(nextStep) : null,
      currentStepIndex: 0,
      totalSteps: steps.length,
    };
  }

  let activeIndex = 0;

  // Xác định bước mà xe đang đi qua dựa trên khoảng cách tới ngã rẽ tiếp theo
  for (let i = 0; i < steps.length - 1; i++) {
    const nextStepCandidate = steps[i + 1];
    if (nextStepCandidate?.maneuver?.location) {
      const [nextLng, nextLat] = nextStepCandidate.maneuver.location;
      const distToTurn = calculateDistanceMeters(
        currentLat,
        currentLng,
        nextLat,
        nextLng,
      );

      // Nếu còn cách ngã rẽ của bước tiếp theo > 15m, tức là người dùng vẫn đang đi trên bước i
      if (distToTurn > 15) {
        activeIndex = i;
        break;
      }
      // Nếu đã đến gần hơn 15m hoặc đã qua ngã rẽ này, thì xe chuyển sang bước tiếp theo
      activeIndex = i + 1;
    }
  }

  const currentStep = steps[activeIndex];
  const nextStep =
    activeIndex + 1 < steps.length ? steps[activeIndex + 1] : null;

  // Tính khoảng cách còn lại trên đường này đến ngã rẽ tiếp theo
  let distanceToManeuver = currentStep?.distance ?? 0;
  if (nextStep?.maneuver?.location) {
    const [nextLng, nextLat] = nextStep.maneuver.location;
    distanceToManeuver = calculateDistanceMeters(
      currentLat,
      currentLng,
      nextLat,
      nextLng,
    );
  } else if (currentStep?.maneuver?.location) {
    const [stepLng, stepLat] = currentStep.maneuver.location;
    distanceToManeuver = calculateDistanceMeters(
      currentLat,
      currentLng,
      stepLat,
      stepLng,
    );
  }

  const currentStreetName =
    currentStep?.name?.trim() ||
    (currentStep?.maneuver?.type === "arrive"
      ? "Điểm cứu hộ"
      : "Đoạn đường nối");

  return {
    currentStep,
    nextStep,
    currentStreetName,
    distanceToManeuver,
    distanceText: formatRouteDistance(distanceToManeuver),
    maneuverInfo: currentStep ? getManeuverInfo(currentStep) : null,
    nextManeuverInfo: nextStep ? getManeuverInfo(nextStep) : null,
    currentStepIndex: activeIndex,
    totalSteps: steps.length,
  };
}
