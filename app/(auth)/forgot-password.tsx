import Button from "@/components/common/Button";
import FormInput from "@/components/common/FormInput";
import TextLink from "@/components/common/TextLink";
import { forgotPasswordSendOtp } from "@/services/auth.service";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/validations/forgotPasswordValidation";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      const payload = { phoneNumber: values.phoneNumber.trim() };
      const response = await forgotPasswordSendOtp(payload);

      if (!response.success || !response.data?.id) {
        Alert.alert(
          "Không thể gửi OTP",
          response.message || "Vui lòng thử lại.",
        );
        return;
      }

      router.push({
        pathname: "/(auth)/verify-reset-otp",
        params: {
          phoneNumber: payload.phoneNumber,
          id: response.data.id,
        },
      });
    } catch (error) {
      Alert.alert(
        "Không thể gửi OTP",
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi. Vui lòng thử lại.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6 py-8">
        <Text className="text-3xl font-bold text-slate-900">
          Quên mật khẩu
        </Text>
        <Text className="mt-2 text-slate-600">
          Nhập số điện thoại để nhận mã OTP khôi phục mật khẩu.
        </Text>

        <View className="mt-4">
          <FormInput
            control={control}
            name="phoneNumber"
            label="Số điện thoại"
            icon="phone"
            error={errors.phoneNumber?.message}
            keyboardType="phone-pad"
            placeholder="Nhập số điện thoại"
          />
        </View>

        <Button
          title={isSubmitting ? "Đang gửi OTP..." : "Gửi mã OTP"}
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: 32 }}
        />

        <TextLink
          text="Quay lại"
          title="Đăng nhập"
          onPress={() => router.replace("/(auth)/login")}
          style={{ marginTop: 20 }}
        />
      </View>
    </SafeAreaView>
  );
}
