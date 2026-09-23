import { useColorScheme } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

export const ColorTokens = {
  light: {
    primary: "#dc2626",
    secondary: "#0ea5e9",
    background: "#f8fafc",
    surface: "#ffffff",
    danger: "#dc2626",
    success: "#16a34a",
    warning: "#d97706",
    text: "#0f172a",
    textMuted: "#64748b",
  },
  dark: {
    primary: "#ef4444",
    secondary: "#38bdf8",
    background: "#0f172a",
    surface: "#1e293b",
    danger: "#ef4444",
    success: "#22c55e",
    warning: "#f59e0b",
    text: "#f8fafc",
    textMuted: "#94a3b8",
  },
} as const;

export type ThemeColors = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  error: string;
  onError: string;
  onBackground: string;
  onSurface: string;
  onPrimary: string;
  onSecondary: string;
  outline: string;
  danger: string;
  success: string;
  warning: string;
  text: string;
  textMuted: string;
};

export type AppTheme = {
  dark: boolean;
  colors: ThemeColors;
};

export const LightTheme: AppTheme = {
  dark: false,
  colors: {
    primary: ColorTokens.light.primary,
    secondary: ColorTokens.light.secondary,
    background: ColorTokens.light.background,
    surface: ColorTokens.light.surface,
    surfaceVariant: "#eef2f7",
    onSurfaceVariant: ColorTokens.light.textMuted,
    error: ColorTokens.light.danger,
    onError: "#ffffff",
    onBackground: ColorTokens.light.text,
    onSurface: ColorTokens.light.text,
    onPrimary: "#ffffff",
    onSecondary: "#ffffff",
    outline: ColorTokens.light.textMuted,
    danger: ColorTokens.light.danger,
    success: ColorTokens.light.success,
    warning: ColorTokens.light.warning,
    text: ColorTokens.light.text,
    textMuted: ColorTokens.light.textMuted,
  },
};

export const DarkTheme: AppTheme = {
  dark: true,
  colors: {
    primary: ColorTokens.dark.primary,
    secondary: ColorTokens.dark.secondary,
    background: ColorTokens.dark.background,
    surface: ColorTokens.dark.surface,
    surfaceVariant: ColorTokens.dark.surface,
    onSurfaceVariant: ColorTokens.dark.textMuted,
    error: ColorTokens.dark.danger,
    onError: "#ffffff",
    onBackground: ColorTokens.dark.text,
    onSurface: ColorTokens.dark.text,
    onPrimary: "#ffffff",
    onSecondary: "#ffffff",
    outline: ColorTokens.dark.textMuted,
    danger: ColorTokens.dark.danger,
    success: ColorTokens.dark.success,
    warning: ColorTokens.dark.warning,
    text: ColorTokens.dark.text,
    textMuted: ColorTokens.dark.textMuted,
  },
};

export const useAppTheme = (): AppTheme => {
  const scheme = useColorScheme();
  return scheme === "dark" ? DarkTheme : LightTheme;
};

export const useTheme = useAppTheme;

export const Spacing = {
  screenHorizontal: wp("5%"),
  screenVertical: hp("2%"),
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
