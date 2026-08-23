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
    color: "#2563eb", // blue-600
    bgColor: "bg-blue-50",
    route: "/(app)/map",
  },
  {
    id: "rescue",
    label: "Gửi cứu hộ",
    icon: "alert-circle-outline",
    color: "#dc2626", // red-600
    bgColor: "bg-red-50",
  },
  {
    id: "team",
    label: "Đội cứu hộ",
    icon: "shield-checkmark-outline",
    color: "#d97706", // amber-600
    bgColor: "bg-amber-50",
  },
  {
    id: "safe-point",
    label: "Điểm an toàn",
    icon: "navigate-outline",
    color: "#059669", // emerald-600
    bgColor: "bg-emerald-50",
  },
  {
    id: "emergency-call",
    label: "SĐT Khẩn cấp",
    icon: "call-outline",
    color: "#e11d48", // rose-600
    bgColor: "bg-rose-50",
  },
  {
    id: "guide",
    label: "Hướng dẫn",
    icon: "book-outline",
    color: "#7c3aed", // purple-600
    bgColor: "bg-purple-50",
  },
  {
    id: "donate",
    label: "Quyên góp",
    icon: "heart-outline",
    color: "#db2777", // pink-600
    bgColor: "bg-pink-50",
  },
  {
    id: "feedback",
    label: "Góp ý",
    icon: "chatbox-ellipses-outline",
    color: "#4f46e5", // indigo-600
    bgColor: "bg-indigo-50",
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
