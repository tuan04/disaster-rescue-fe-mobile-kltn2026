import React from "react";
import { StyleSheet } from "react-native";
import {
    Button as PaperButton,
    useTheme,
    type ButtonProps as PaperButtonProps,
} from "react-native-paper";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

type ButtonProps = {
  title: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
} & Omit<
  PaperButtonProps,
  "children" | "loading" | "disabled" | "mode" | "buttonColor" | "textColor"
>;

export default function Button({
  title,
  loading = false,
  disabled = false,
  variant = "primary",
  contentStyle,
  labelStyle,
  style,
  ...props
}: ButtonProps) {
  const theme = useTheme();

  const modeByVariant: Record<ButtonVariant, PaperButtonProps["mode"]> = {
    primary: "contained",
    secondary: "contained-tonal",
    outline: "outlined",
    ghost: "text",
    danger: "contained",
  };

  const colorByVariant: Record<
    ButtonVariant,
    Pick<PaperButtonProps, "buttonColor" | "textColor">
  > = {
    primary: {
      buttonColor: theme.colors.primary,
      textColor: theme.colors.onPrimary,
    },
    secondary: {
      buttonColor: theme.colors.secondary,
      textColor: theme.colors.onSecondary,
    },
    outline: {
      textColor: theme.colors.primary,
    },
    ghost: {
      textColor: theme.colors.primary,
    },
    danger: {
      buttonColor: theme.colors.error,
      textColor: theme.colors.onError,
    },
  };

  return (
    <PaperButton
      mode={modeByVariant[variant]}
      loading={loading}
      disabled={disabled || loading}
      style={[styles.button, style]}
      contentStyle={[styles.content, contentStyle]}
      labelStyle={[styles.label, labelStyle]}
      {...colorByVariant[variant]}
      {...props}
    >
      {title}
    </PaperButton>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
  },
  content: {
    minHeight: 52,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});
