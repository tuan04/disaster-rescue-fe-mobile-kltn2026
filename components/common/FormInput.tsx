import React from "react";
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { Text, View } from "react-native";
import {
  TextInput as PaperTextInput,
  useTheme,
  type TextInputIconProps,
} from "react-native-paper";

type FormInputProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: Path<TFieldValues>;
  label: string;
  icon?: TextInputIconProps["icon"];
  error?: string;
  formatValue?: (value: string) => string;
} & Omit<
  React.ComponentProps<typeof PaperTextInput>,
  "error" | "label" | "left" | "onBlur" | "onChangeText" | "value"
>;

function FormInput<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  icon,
  error,
  formatValue,
  mode = "outlined",
  ...inputProps
}: FormInputProps<TFieldValues>) {
  const theme = useTheme();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <View className="mt-4">
          <PaperTextInput
            value={typeof value === "string" ? value : ""}
            onChangeText={(text) =>
              onChange(formatValue ? formatValue(text) : text)
            }
            onBlur={onBlur}
            mode={mode}
            label={label}
            error={Boolean(error)}
            left={icon ? <PaperTextInput.Icon icon={icon} /> : undefined}
            placeholder={label}
            placeholderTextColor={theme.colors.outline}
            outlineColor={theme.colors.outline}
            activeOutlineColor={theme.colors.secondary}
            textColor={theme.colors.onSurface}
            style={{ backgroundColor: theme.colors.background }}
            outlineStyle={{ borderRadius: 12 }}
            {...inputProps}
          />
          {error && <ErrorText message={error} />}
        </View>
      )}
    />
  );
}

function ErrorText({ message }: { message: string }) {
  return <Text className="mt-1 text-sm text-red-600">{message}</Text>;
}

export default FormInput;
