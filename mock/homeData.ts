import { ColorTokens } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

export interface UtilityItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route?: string;
}

export const UTILITIES: UtilityItem[] = [
  {
    id: "map",
    label: "Bản đồ thảm họa",
    icon: "map-outline",
    color: ColorTokens.light.secondary,
    bgColor: "bg-secondary/10",
    route: "/(app)/map",
  },
  {
    id: "sos-point",
    label: "Cần cứu trợ",
    icon: "alert-circle-outline",
    color: ColorTokens.light.danger,
    bgColor: "bg-danger/10",
    route: "/(pages)/sos-point",
  },
  {
    id: "hazard-point",
    label: "Điểm nguy hiểm",
    icon: "warning-outline",
    color: ColorTokens.light.warning,
    bgColor: "bg-warning/10",
    route: "/(pages)/hazard-point",
  },
  {
    id: "safe-point",
    label: "Điểm an toàn",
    icon: "shield-checkmark-outline",
    color: ColorTokens.light.success,
    bgColor: "bg-success/10",
    route: "/(pages)/safe-point",
  },
  {
    id: "warehouse-point",
    label: "Kho cứu trợ",
    icon: "cube-outline",
    color: ColorTokens.light.secondary,
    bgColor: "bg-secondary/10",
    route: "/(pages)/warehouse-point",
  },
  {
    id: "team",
    label: "Đội cứu hộ",
    icon: "people-outline",
    color: ColorTokens.light.warning,
    bgColor: "bg-warning/10",
  },
  {
    id: "rescue-mission",
    label: "Nhiệm vụ cứu hộ",
    icon: "clipboard-outline",
    color: ColorTokens.light.primary,
    bgColor: "bg-primary/10",
    route: "/(pages)/pending-assignments",
  },
  {
    id: "emergency-call",
    label: "SĐT Khẩn cấp",
    icon: "call-outline",
    color: ColorTokens.light.danger,
    bgColor: "bg-danger/10",
  },
  {
    id: "guide",
    label: "Hướng dẫn",
    icon: "book-outline",
    color: ColorTokens.light.primary,
    bgColor: "bg-primary/10",
  },
];

