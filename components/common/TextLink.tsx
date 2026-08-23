import React from "react";
import {
  Pressable,
  Text,
  type GestureResponderEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme } from "react-native-paper";

type TextLinkAlign = "left" | "center" | "right";

type TextLinkProps = {
  title: string;
  text?: string;
  align?: TextLinkAlign;
  disabled?: boolean;
  onPress: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export default function TextLink({
  title,
  text,
  align = "center",
  disabled = false,
  onPress,
  style,
  textStyle,
  titleStyle,
}: TextLinkProps) {
  const theme = useTheme();

  const alignSelfByTextAlign: Record<TextLinkAlign, ViewStyle["alignSelf"]> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[{ alignSelf: alignSelfByTextAlign[align] }, style]}
    >
      <Text
        style={[
          { color: theme.colors.onSurfaceVariant, textAlign: align },
          textStyle,
        ]}
      >
        {text ? `${text} ` : null}
        <Text
          style={[
            {
              color: disabled ? theme.colors.outline : theme.colors.secondary,
              fontWeight: "700",
            },
            titleStyle,
          ]}
        >
          {title}
        </Text>
      </Text>
    </Pressable>
  );
}
