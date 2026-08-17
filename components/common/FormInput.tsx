import { RegisterFormValues } from "@/types/auth";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { TextInput, View, Text } from "react-native";


function FormInput({
  control,
  name,
  label,
  error,
  ...inputProps
}: {
  control: ReturnType<typeof useForm<RegisterFormValues>>["control"];
  name: keyof RegisterFormValues;
  label: string;
  error?: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <View className="mt-4">
          <Text className="mb-2 font-medium text-slate-700">{label}</Text>
          <TextInput
            value={typeof value === "string" ? value : ""}
            onChangeText={onChange}
            onBlur={onBlur}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
            placeholder={label}
            placeholderTextColor="#94a3b8"
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