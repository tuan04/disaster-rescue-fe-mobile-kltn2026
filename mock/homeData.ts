import { ColorTokens } from "@/contants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";

export interface UtilityItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  route?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  image: string;
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

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: "1",
    title: "Cảnh báo bão số 3 diễn biến phức tạp, nguy cơ lũ quét tại các tỉnh phía Bắc",
    source: "Trung tâm Dự báo KTTV",
    time: "30 phút trước",
    image:
      "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "2",
    title: "Hướng dẫn kỹ năng an toàn và ứng phó khi xảy ra ngập lụt diện rộng",
    source: "Đội Cứu hộ Quốc gia",
    time: "2 giờ trước",
    image:
      "https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "3",
    title: "Hơn 500 chiến sĩ cứu hộ sẵn sàng túc trực tại các khu vực trọng điểm",
    source: "Báo Cứu hộ & Thảm họa",
    time: "5 giờ trước",
    image:
      "https://images.unsplash.com/photo-1516475429286-465d815a0df7?q=80&w=400&auto=format&fit=crop",
  },
];
