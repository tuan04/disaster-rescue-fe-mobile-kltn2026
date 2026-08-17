import { Dimensions, PixelRatio, Platform } from "react-native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

export const ColorTokens = {
  light: {
    primary: "#171d2f",
    secondary: "#10b4c0",
    background: "#f9fafb",
    surface: "#ffffff",
    danger: "#d9383a",
    success: "#10ce19",
    warning: "#f59e0b",
    text: "#111827",
    textMuted: "#b6b6b6",
  },
  dark: {
    primary: "#171d2f",
    secondary: "#10b4c0",
    background: "#121212",
    surface: "#12183b",
    danger: "#d9383a",
    success: "#10ce19",
    warning: "#f59e0b",
    text: "#ffffff",
    textMuted: "#9ba1a6",
  },
} as const;

export const customColors = {
  danger: ColorTokens.light.danger,
  success: ColorTokens.light.success,
  warning: ColorTokens.light.warning,
};

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: ColorTokens.light.primary,
    secondary: ColorTokens.light.secondary,
    background: ColorTokens.light.background,
    surface: ColorTokens.light.surface,
    error: ColorTokens.light.danger,
    onBackground: ColorTokens.light.text,
    onSurface: ColorTokens.light.text,
    onPrimary: ColorTokens.light.surface,
    onSecondary: ColorTokens.light.surface,
    outline: ColorTokens.light.textMuted,
    surfaceVariant: "#eef2f7",
    onSurfaceVariant: ColorTokens.light.textMuted,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: "#eef2f7",
    },
    danger: ColorTokens.light.danger,
    success: ColorTokens.light.success,
    warning: ColorTokens.light.warning,
    text: ColorTokens.light.text,
    textMuted: ColorTokens.light.textMuted,
  },
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: ColorTokens.dark.primary,
    secondary: ColorTokens.dark.secondary,
    background: ColorTokens.dark.background,
    surface: ColorTokens.dark.surface,
    error: ColorTokens.dark.danger,
    onBackground: ColorTokens.dark.text,
    onSurface: ColorTokens.dark.text,
    onPrimary: ColorTokens.dark.text,
    onSecondary: ColorTokens.dark.text,
    outline: ColorTokens.dark.textMuted,
    surfaceVariant: ColorTokens.dark.surface,
    onSurfaceVariant: ColorTokens.dark.textMuted,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: ColorTokens.dark.surface,
    },
    danger: ColorTokens.dark.danger,
    success: ColorTokens.dark.success,
    warning: ColorTokens.dark.warning,
    text: ColorTokens.dark.text,
    textMuted: ColorTokens.dark.textMuted,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const scale = SCREEN_WIDTH / 375;

export function scaleFont(size: number) {
  return Math.round(
    PixelRatio.roundToNearestPixel(size * Math.max(0.9, Math.min(scale, 1.2))),
  );
}

export const Typography = {
  sizes: {
    xs: scaleFont(12),
    sm: scaleFont(14),
    md: scaleFont(15),
    lg: scaleFont(18),
    titleSm: scaleFont(20),
    titleMd: scaleFont(22),
    title: scaleFont(24),
    heading: scaleFont(32),
    display: scaleFont(40),
    xl: scaleFont(24),
    xxl: scaleFont(32),
    sos: scaleFont(50),
  },
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
};

export const Spacing = {
  screenHorizontal: wp("5%"),
  screenVertical: hp("2%"),
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
