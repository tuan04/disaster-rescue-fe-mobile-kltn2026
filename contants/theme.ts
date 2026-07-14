// theme.ts
import { Dimensions, PixelRatio, Platform } from "react-native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

// ĐỊNH NGHĨA HỆ MÀU CỨU TRỢ (Bổ sung vào React Native Paper)
const customColors = {
  danger: "#D9383A", // Cảnh báo nguy hiểm, sạt lở
  success: "#2E7D32", // Ca cứu trợ hoàn thành, vùng an toàn
  warning: "#F59E0B", // Đang xử lý, vùng có nguy cơ ngập
};

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#FF6B00", // Cam cứu hộ (Màu chủ đạo)
    secondary: "#1A365D", // Xanh Navy (Màu phụ)
    background: "#F9FAFB", // Nền sáng dịu mắt
    surface: "#FFFFFF", // Nền của Card/Component
    text: "#11181C",
    ...customColors,
  },
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#FF7A1A", // Cam sáng hơn trên nền tối
    secondary: "#2A4365", // Xanh Navy tối
    background: "#121212", // Đen ròng (OLED tinh chỉnh tiết kiệm pin)
    surface: "#1E1E1E", // Nền Card tối
    text: "#ECEDEE",
    ...customColors,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Reponsive
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Máy chuẩn để thiết kế thường là màn hình có chiều rộng 375px (như iPhone X/Pixel 3)
const scale = SCREEN_WIDTH / 375;

export function scaleFont(size: number) {
  Math.round(
    PixelRatio.roundToNearestPixel(
      size * Math.max(0.9, Math.min(scale, 1.2))
    )
  )
}

export const Typography = {
  sizes: {
    xs: scaleFont(12), // Caption, thời gian gửi, text cực nhỏ
    sm: scaleFont(14), // Body phụ, nhãn phụ dưới icon, mô tả ngắn
    md: scaleFont(16), // Chữ body mặc định
    lg: scaleFont(18), // Tiêu đề nhỏ, tiêu đề các thẻ Card
    xl: scaleFont(22), // Tiêu đề màn hình chính (Header Title)
    xxl: scaleFont(32), // Số liệu lớn, hoặc chữ khẩn cấp tầm trung
    sos: scaleFont(50), // Dành riêng cho chữ S O S khổng lồ
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
};

export const Spacing = {
  // Khoảng cách lề ngang (Margin/Padding Horizontal - mx)
  screenHorizontal: wp("5%"), // Luôn cách lề trái/phải đúng 5% chiều rộng màn hình

  // Khoảng cách lề dọc (Margin/Padding Vertical - my)
  screenVertical: hp("2%"), // Cách lề trên/dưới 2% chiều cao màn hình

  // Các khoảng cách nhỏ hơn để dùng bên trong các thẻ Card, Button
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
