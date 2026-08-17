import { yupResolver } from "@hookform/resolvers/yup";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { verifyOtp } from "@/services/auth.service";
import { otpSchema } from "@/validations/registerValidation";
import { ApiResponse } from "@/types/response";

interface OtpFormValues {
  otpCode: string;
}

export default function OtpVerificationScreen() {
  const { phone, id } = useLocalSearchParams<{ phone?: string; id?: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OtpFormValues>({
    resolver: yupResolver(otpSchema),
    defaultValues: { otpCode: "" },
  });
  const submitOtp = async ({ otpCode }: OtpFormValues) => {
    if (!phone || !id) {
      Alert.alert(
        "Thiếu thông tin xác thực",
        "Vui lòng quay lại màn hình đăng ký để tạo tài khoản lại.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const res : ApiResponse = await verifyOtp({
        id: String(id),
        otp: otpCode,
        phoneNumber: phone,
      }); 
      if (res.success === true) {
        Alert.alert(
          "Đăng ký thành công",
          "Tài khoản của bạn đã được xác thực.",
          [{ text: "Đăng nhập", onPress: () => router.replace("/auth/login") }],
        );
      }
    } catch (error) {
      Alert.alert(
        "Xác thực thất bại",
        error instanceof Error ? error.message : "Mã OTP không hợp lệ.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-slate-900">Xác thực OTP</Text>
        <Text className="mt-3 text-slate-600">
          Nhập mã gồm 6 số đã gửi đến {phone ?? "số điện thoại của bạn"}.
        </Text>
        <Controller
          control={control}
          name="otpCode"
          render={({ field: { value, onChange, onBlur } }) => (
            <View className="mt-8">
              <TextInput
                value={value}
                onChangeText={(text) =>
                  onChange(text.replace(/\D/g, "").slice(0, 6))
                }
                onBlur={onBlur}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-center text-2xl font-bold tracking-[12px] text-slate-900"
                placeholder="000000"
                placeholderTextColor="#94a3b8"
              />
              {errors.otpCode?.message && (
                <Text className="mt-2 text-sm text-red-600">
                  {errors.otpCode.message}
                </Text>
              )}
            </View>
          )}
        />
        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit(submitOtp)}
          className={`mt-6 rounded-xl py-4 ${isSubmitting ? "bg-orange-300" : "bg-orange-600"}`}
        >
          <Text className="text-center text-base font-bold text-white">
            {isSubmitting ? "Đang xác thực..." : "Xác thực"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
