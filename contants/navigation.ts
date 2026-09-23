import { MaterialCommunityIcons } from "@expo/vector-icons";

export interface ManeuverInfo {
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  shortAction: string;
}

export const MANEUVER_MAP: Record<string, ManeuverInfo> = {
  arrive: { iconName: "flag-checkered", shortAction: "Đến nơi" },
  depart: { iconName: "arrow-up", shortAction: "Xuất phát" },
  straight: { iconName: "arrow-up", shortAction: "Đi thẳng" },
  uturn: { iconName: "arrow-u-left-top-bold", shortAction: "Quay đầu" },
  left: { iconName: "arrow-left-top", shortAction: "Rẽ trái" },
  "slight left": { iconName: "arrow-top-left-thick", shortAction: "Chếch trái" },
  "slight-left": { iconName: "arrow-top-left-thick", shortAction: "Chếch trái" },
  "sharp left": { iconName: "arrow-left-top", shortAction: "Rẽ trái gắt" },
  "sharp-left": { iconName: "arrow-left-top", shortAction: "Rẽ trái gắt" },
  right: { iconName: "arrow-right-top", shortAction: "Rẽ phải" },
  "slight right": { iconName: "arrow-top-right-thick", shortAction: "Chếch phải" },
  "slight-right": { iconName: "arrow-top-right-thick", shortAction: "Chếch phải" },
  "sharp right": { iconName: "arrow-right-top", shortAction: "Rẽ phải gắt" },
  "sharp-right": { iconName: "arrow-right-top", shortAction: "Rẽ phải gắt" },
  roundabout: { iconName: "rotate-left", shortAction: "Vào bùng binh" },
  rotary: { iconName: "rotate-left", shortAction: "Vào bùng binh" },
  ramp: { iconName: "arrow-top-right-thick", shortAction: "Lên cầu/dốc" },
  merge: { iconName: "merge", shortAction: "Nhập làn" },
  "fork left": { iconName: "arrow-top-left-thick", shortAction: "Nhánh trái" },
  "fork right": { iconName: "arrow-top-right-thick", shortAction: "Nhánh phải" },
};