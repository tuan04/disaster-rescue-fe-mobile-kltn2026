import React from "react";
import { Pressable, Text, type GestureResponderEvent } from "react-native";

type TextLinkAlign = "left" | "center" | "right";

type TextLinkProps = {
  title: string;
  text?: string;
  align?: TextLinkAlign;
  disabled?: boolean;
  onPress: (event: GestureResponderEvent) => void;
  className?: string;
  textClassName?: string;
  titleClassName?: string;
};

const alignSelfMap: Record<TextLinkAlign, string> = {
  left: "self-start",
  center: "self-center",
  right: "self-end",
};

export default function TextLink({
  title,
  text,
  align = "center",
  disabled = false,
  onPress,
  className = "",
  textClassName = "",
  titleClassName = "",
}: TextLinkProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className={`py-1 active:opacity-70 ${alignSelfMap[align]} ${className}`}
    >
      <Text
        className={`text-sm text-slate-500 dark:text-slate-400 text-${align} ${textClassName}`}
      >
        {text ? `${text} ` : null}
        <Text
          className={`text-sm font-bold ${
            disabled ? "text-slate-400 dark:text-slate-600" : "text-secondary"
          } ${titleClassName}`}
        >
          {title}
        </Text>
      </Text>
    </Pressable>
  );
}
