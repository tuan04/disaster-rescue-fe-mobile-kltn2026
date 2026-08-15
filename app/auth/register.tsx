import DateTimePicker from "@react-native-community/datetimepicker";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { registerAccount } from "@/services/auth.service";
import type {
  RegisterFormValues,
  RegisterRequest,
  Sex,
  UserRole,
} from "@/types/auth";
import {
  citizenRegisterSchema,
  rescuerRegisterSchema,
} from "@/validations/registerValidation";

import FormInput from "@/components/common/FormInput";
import { ApiResponse } from "@/types/response";

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: "Người dân", value: "CITIZEN" },
  { label: "Người cứu hộ", value: "RESCUER" },
];

const SEX_OPTIONS: { label: string; value: Sex }[] = [
  { label: "Nam", value: "MALE" },
  { label: "Nữ", value: "FEMALE" },
  { label: "Khác", value: "OTHER" },
];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function RegisterScreen() {
  const [role, setRole] = useState<UserRole>("CITIZEN");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(
      role === "CITIZEN" ? citizenRegisterSchema : rescuerRegisterSchema,
    ),
    defaultValues: {
      phone: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      cccdNumber: "",
    },
  });

  const changeRole = (nextRole: UserRole) => {
    setRole(nextRole);
    reset();
  };

  const onSubmit = async (values: RegisterFormValues) => {
    if (!values.birthDate || !values.sex) return;
    setIsSubmitting(true);
    try {
      const payload: RegisterRequest = {
        phone: values.phone.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
        fullName: values.fullName.trim(),
        birthDate: formatDate(values.birthDate),
        sex: values.sex,
        ...(role === "RESCUER"
          ? { cccdNumber: values.cccdNumber?.trim() }
          : {}),
      };
      const res: ApiResponse = await registerAccount(role, payload);
      const registrationId = res.data?.id;

      if (res.success === true) {
        router.push({
          pathname: "/auth/otp-verification",
          params: {
            phone: payload.phone,
            id: registrationId ? String(registrationId) : "",
          },
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert(
        "Không thể đăng ký",
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-6 pb-10"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-slate-900">Tạo tài khoản</Text>
        <Text className="mt-2 text-slate-600">
          Chọn vai trò và điền thông tin của bạn.
        </Text>
        <View className="mt-6 flex-row rounded-xl bg-slate-200 p-1">
          {ROLE_OPTIONS.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => changeRole(item.value)}
              className={`flex-1 rounded-lg py-3 ${role === item.value ? "bg-white" : ""}`}
            >
              <Text
                className={`text-center font-semibold ${role === item.value ? "text-orange-600" : "text-slate-600"}`}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <FormInput
          control={control}
          name="fullName"
          label="Họ và tên"
          error={errors.fullName?.message}
        />
        <FormInput
          control={control}
          name="phone"
          label="Số điện thoại"
          keyboardType="phone-pad"
          error={errors.phone?.message}
        />
        <FormInput
          control={control}
          name="password"
          label="Mật khẩu"
          secureTextEntry
          error={errors.password?.message}
        />
        <FormInput
          control={control}
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          secureTextEntry
          error={errors.confirmPassword?.message}
        />
        {role === "RESCUER" && (
          <FormInput
            control={control}
            name="cccdNumber"
            label="Số CCCD"
            keyboardType="number-pad"
            error={errors.cccdNumber?.message}
          />
        )}
        <Controller
          control={control}
          name="birthDate"
          render={({ field: { value, onChange } }) => (
            <View className="mt-4">
              <Text className="mb-2 font-medium text-slate-700">Ngày sinh</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3"
              >
                <Text className={value ? "text-slate-900" : "text-slate-400"}>
                  {value ? formatDate(value) : "Chọn ngày sinh"}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={value ?? new Date(2000, 0, 1)}
                  mode="date"
                  maximumDate={new Date()}
                  onChange={(_, selectedDate) => {
                    if (Platform.OS === "android") setShowDatePicker(false);
                    if (selectedDate) onChange(selectedDate);
                  }}
                />
              )}
              {errors.birthDate?.message && (
                <ErrorText message={errors.birthDate.message} />
              )}
            </View>
          )}
        />
        <Controller
          control={control}
          name="sex"
          render={({ field: { value, onChange } }) => (
            <View className="mt-4">
              <Text className="mb-2 font-medium text-slate-700">Giới tính</Text>
              <View className="flex-row gap-2">
                {SEX_OPTIONS.map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => onChange(item.value)}
                    className={`flex-1 rounded-xl border px-2 py-3 ${value === item.value ? "border-orange-500 bg-orange-50" : "border-slate-300 bg-white"}`}
                  >
                    <Text
                      className={`text-center ${value === item.value ? "font-semibold text-orange-600" : "text-slate-700"}`}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {errors.sex?.message && (
                <ErrorText message={errors.sex.message} />
              )}
            </View>
          )}
        />
        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          className={`mt-8 rounded-xl py-4 ${isSubmitting ? "bg-orange-300" : "bg-orange-600"}`}
        >
          <Text className="text-center text-base font-bold text-white">
            {isSubmitting ? "Đang đăng ký..." : "Đăng ký"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.replace("/auth/login")}
          className="mt-5"
        >
          <Text className="text-center text-slate-600">
            Đã có tài khoản?{" "}
            <Text className="font-bold text-orange-600">Đăng nhập</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ErrorText({ message }: { message: string }) {
  return <Text className="mt-1 text-sm text-red-600">{message}</Text>;
}
