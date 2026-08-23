import {
  EmergencyLevel,
  HazardType,
  PointType,
  RequestStatus,
  SafePointType,
} from "@/types/map";

export const pointTypeLabel: Record<PointType, string> = {
  SOS: "Điểm cần cứu trợ",
  HAZARD: "Điểm nguy hiểm",
  SAFE_ZONE: "Điểm an toàn",
  WARE_HOUSE: "Kho cứu trợ",
};

export const rescueStatusLabel: Record<RequestStatus, string> = {
  PENDING: "Đang chờ cứu trợ",
  ACCEPTED: "Đã được tiếp nhận",
  COMPLETED: "Cứu hộ thành công",
};

export const emergencyLevelLabel: Record<EmergencyLevel, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
};

export const hazardTypeLabel: Record<HazardType, string> = {
  FALLEN_TREE: "Cây đổ",
  LANDSLIDE: "Sạt lở",
  FLOOD_DEEP: "Ngập sâu",
  POWER_LINE_DOWN: "Đứt đường điện",
};

export const safePointTypeLabel: Record<SafePointType, string> = {
  EVACUATION_CENTER: "Trung tâm sơ tán",
  MEDICAL_STATION: "Trạm y tế",
  TEMPORARY_CAMP: "Trại tạm",
  WATER_STATION: "Trạm cấp nước",
};
