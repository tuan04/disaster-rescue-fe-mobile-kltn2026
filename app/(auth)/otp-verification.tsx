import Button from "@/components/common/Button";
import FormInput from "@/components/common/FormInput";
import { verifyOtp } from "@/services/auth.service";
import type { ApiResponse } from "@/types/response";
import { otpSchema } from "@/validations/registerValidation";
import { yupResolver } from "@hookform/resolvers/yup";
import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface OtpFormValues {
  otpCode: string;
}

const formatOtp = (value: string) => value.replace(/\D/g, "").slice(0, 6);

export default function OtpVerificationScreen() {
  const { phone, id } = useLocalSearchParams<{ phone?: string; id?: string }>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
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

    try {
      const res: ApiResponse = await verifyOtp({
        id: String(id),
        otp: otpCode,
        phoneNumber: phone,
      });

      if (res.success === true) {
        Alert.alert(
          "Đăng ký thành công",
          "Tài khoản của bạn đã được xác thực.",
          [
            {
              text: "Đăng nhập",
              onPress: () => router.replace("/(auth)/login"),
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert(
        "Xác thực thất bại",
        error instanceof Error ? error.message : "Mã OTP không hợp lệ.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-slate-900">Xác thực OTP</Text>
        <Text className="mt-3 text-slate-600">
          Nhập mã gồm 6 số đã gửi đến {phone ?? "số điện thoại của bạn"}.
        </Text>

        <View className="mt-4">
          <FormInput
            control={control}
            name="otpCode"
            label="Mã OTP"
            icon="shield-check"
            error={errors.otpCode?.message}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            placeholder="000000"
            formatValue={formatOtp}
            contentStyle={{
              fontSize: 24,
              fontWeight: "700",
              letterSpacing: 10,
              textAlign: "center",
            }}
          />
        </View>

        <Button
          title={isSubmitting ? "Đang xác thực..." : "Xác thực"}
          loading={isSubmitting}
          onPress={handleSubmit(submitOtp)}
          style={{ marginTop: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}
