import FormInput from "@/components/common/FormInput";
import Button from "@/components/common/Button";
import { verifyForgotPasswordOtp } from "@/services/auth.service";
import {
  verifyResetOtpSchema,
  type VerifyResetOtpFormValues,
} from "@/validations/forgotPasswordValidation";
import { yupResolver } from "@hookform/resolvers/yup";
import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatOtp = (value: string) => value.replace(/\D/g, "").slice(0, 6);

export default function VerifyResetOtpScreen() {
  const { id, phoneNumber } = useLocalSearchParams<{
    id?: string;
    phoneNumber?: string;
  }>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyResetOtpFormValues>({
    resolver: yupResolver(verifyResetOtpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const onSubmit = async (values: VerifyResetOtpFormValues) => {
    if (!id || !phoneNumber) {
      Alert.alert(
        "Thiếu dữ liệu",
        "Vui lòng quay lại bước nhập số điện thoại.",
      );
      return;
    }

    try {
      const payload = {
        id: String(id),
        phoneNumber: String(phoneNumber),
        otp: values.otp.trim(),
      };

      const response = await verifyForgotPasswordOtp(payload);

      if (!response.success) {
        Alert.alert(
          "Xác thực OTP thất bại",
          response.message || "Vui lòng thử lại.",
        );
        return;
      }

      router.push({
        pathname: "/(auth)/reset-password",
        params: {
          resetToken: response.data.resetToken,
          phone: String(phoneNumber),
        },
      });
    } catch (error) {
      Alert.alert(
        "Xác thực OTP thất bại",
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi. Vui lòng thử lại.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6 py-8">
        <Text className="text-3xl font-bold text-slate-900">Xác thực OTP</Text>
        <Text className="mt-2 text-slate-600">
          Nhập mã OTP 6 số đã gửi đến{" "}
          {phoneNumber ? String(phoneNumber) : "số điện thoại của bạn"}.
        </Text>

        <View className="mt-4">
          <FormInput
            control={control}
            name="otp"
            label="Mã OTP"
            icon="shield-check"
            error={errors.otp?.message}
            keyboardType="number-pad"
            placeholder="Nhập mã OTP"
            maxLength={6}
            formatValue={formatOtp}
          />
        </View>

        <Button
          title={isSubmitting ? "Đang xác thực..." : "Xác thực OTP"}
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: 32 }}
        />
      </View>
    </SafeAreaView>
  );
}
