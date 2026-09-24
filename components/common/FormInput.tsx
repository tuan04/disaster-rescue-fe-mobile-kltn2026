import { useAppTheme } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import {
  Pressable,
  type StyleProp,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
} from "react-native";

type FormInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap | string;
  error?: string;
  formatValue?: (value: string) => string;
  contentStyle?: StyleProp<TextStyle>;
  containerClassName?: string;
  wrapperClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  showCharCount?: boolean;
} & Omit<TextInputProps, "onChangeText" | "value">;

function FormInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  icon,
  error,
  formatValue,
  contentStyle,
  containerClassName = "",
  wrapperClassName = "mt-4",
  labelClassName = "",
  inputClassName = "",
  showCharCount = false,
  style,
  secureTextEntry,
  multiline,
  numberOfLines,
  textAlignVertical,
  ...inputProps
}: FormInputProps<TFieldValues>) {
  const theme = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = Boolean(secureTextEntry);
  const isMultiline = Boolean(multiline);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => {
        const hasError = Boolean(error);
        const currentLength = typeof value === "string" ? value.length : 0;

        return (
          <View className={wrapperClassName}>
            {label ? (
              <Text
                className={`mb-1.5 text-sm font-medium ${
                  hasError ? "text-danger" : "text-slate-600 dark:text-slate-300"
                } ${labelClassName}`}
              >
                {label}
              </Text>
            ) : null}

            <View
              className={`flex-row rounded-xl border px-3 bg-surface ${
                isMultiline
                  ? "items-start py-2.5 min-h-[96px]"
                  : "items-center min-h-[48px]"
              } ${
                hasError
                  ? "border-danger"
                  : isFocused
                    ? "border-secondary"
                    : "border-slate-300 dark:border-slate-700"
              } ${containerClassName}`}
            >
              {icon ? (
                <View
                  className={`mr-2.5 items-center justify-center ${
                    isMultiline ? "mt-1" : ""
                  }`}
                >
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={20}
                    color={
                      hasError
                        ? theme.colors.error
                        : isFocused
                          ? theme.colors.secondary
                          : theme.colors.textMuted
                    }
                  />
                </View>
              ) : null}

              <TextInput
                value={typeof value === "string" ? value : ""}
                onChangeText={(text) =>
                  onChange(formatValue ? formatValue(text) : text)
                }
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  onBlur();
                }}
                placeholder={inputProps.placeholder || label}
                placeholderTextColor={theme.colors.textMuted}
                secureTextEntry={isPassword ? !showPassword : false}
                multiline={multiline}
                numberOfLines={numberOfLines}
                textAlignVertical={
                  textAlignVertical || (isMultiline ? "top" : "center")
                }
                className={`flex-1 text-base text-text ${
                  isMultiline ? "min-h-[80px] py-0" : "py-2.5"
                } ${inputClassName}`}
                style={[contentStyle, style]}
                {...inputProps}
              />

              {isPassword ? (
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  className="p-1 items-center justify-center ml-1 active:opacity-60"
                >
                  <MaterialCommunityIcons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            {error || showCharCount ? (
              <View className="flex-row items-center justify-between mt-1">
                {error ? (
                  <Text className="flex-1 text-sm text-danger">{error}</Text>
                ) : (
                  <View className="flex-1" />
                )}
                {showCharCount ? (
                  <Text className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                    {inputProps.maxLength
                      ? `${currentLength}/${inputProps.maxLength}`
                      : `${currentLength}`}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      }}
    />
  );
}

export default FormInput;
