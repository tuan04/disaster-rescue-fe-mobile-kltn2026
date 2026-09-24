import { useAppTheme } from "@/constants/theme";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  Text,
  View,
  type ViewStyle,
} from "react-native";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";

export type ButtonProps = {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  className?: string;
  labelClassName?: string;
  icon?:
    | React.ReactNode
    | ((props: { size: number; color: string }) => React.ReactNode);
  style?: StyleProp<ViewStyle>;
} & Omit<PressableProps, "children" | "style">;

const variantClasses: Record<
  ButtonVariant,
  { button: string; text: string; iconColorKey: "white" | "primary" }
> = {
  primary: {
    button: "bg-primary border-transparent",
    text: "text-white",
    iconColorKey: "white",
  },
  secondary: {
    button: "bg-secondary border-transparent",
    text: "text-white",
    iconColorKey: "white",
  },
  outline: {
    button: "bg-transparent border border-primary",
    text: "text-primary",
    iconColorKey: "primary",
  },
  ghost: {
    button: "bg-transparent border-transparent",
    text: "text-primary",
    iconColorKey: "primary",
  },
  danger: {
    button: "bg-danger border-transparent",
    text: "text-white",
    iconColorKey: "white",
  },
  success: {
    button: "bg-success border-transparent",
    text: "text-white",
    iconColorKey: "white",
  },
};

export default function Button({
  title,
  loading = false,
  disabled = false,
  variant = "primary",
  icon,
  className = "",
  labelClassName = "",
  onPress,
  style,
  ...pressableProps
}: ButtonProps) {
  const theme = useAppTheme();
  const config = variantClasses[variant] || variantClasses.primary;
  const isMuted = disabled && !loading;

  const iconColor = isMuted
    ? variant === "outline" || variant === "ghost"
      ? theme.colors.outline
      : "#ffffffb3"
    : config.iconColorKey === "white"
      ? "#ffffff"
      : theme.colors.primary;

  const renderIcon = () => {
    if (!icon || loading) return null;
    if (typeof icon === "function") {
      return (
        <View className="mr-2 items-center justify-center">
          {icon({ size: 18, color: iconColor })}
        </View>
      );
    }
    return <View className="mr-2 items-center justify-center">{icon}</View>;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={style}
      android_ripple={{
        color:
          disabled || loading
            ? "transparent"
            : variant === "outline" || variant === "ghost"
              ? theme.colors.primary + "26"
              : "rgba(255, 255, 255, 0.35)",
        foreground: true,
      }}
      className={`flex-row items-center justify-center rounded-xl min-h-[48px] px-4 py-2.5 overflow-hidden active:scale-[0.99] ${
        config.button
      } ${
        isMuted
          ? "opacity-40"
          : loading
            ? "opacity-70"
            : ""
      } ${className}`}
      {...pressableProps}
    >
      {loading ? (
        <View className="mr-2.5 items-center justify-center">
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      ) : (
        renderIcon()
      )}
      <Text
        className={`text-base font-bold ${config.text} ${
          isMuted
            ? variant === "outline" || variant === "ghost"
              ? "text-slate-400 dark:text-slate-500"
              : "text-white/80"
            : ""
        } ${labelClassName}`}
      >
        {title}
      </Text>
    </Pressable>
  );
}
