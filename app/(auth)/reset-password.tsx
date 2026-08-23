import FormInput from "@/components/common/FormInput";
import Button from "@/components/common/Button";
import { resetForgotPassword } from "@/services/auth.service";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/validations/forgotPasswordValidation";
import { yupResolver } from "@hookform/resolvers/yup";
import { router, useLocalSearchParams } from "expo-router";
import { useForm } from "react-hook-form";
import { Alert, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ResetPasswordScreen() {
  const { resetToken, phone } = useLocalSearchParams<{
    resetToken?: string;
    phone?: string;
  }>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      phone: String(phone ?? ""),
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!resetToken || !phone) {
      Alert.alert(
        "Thiếu dữ liệu",
        "Vui lòng thực hiện lại luồng quên mật khẩu từ đầu.",
      );
      return;
    }

    try {
      const payload = {
        phone: String(phone).trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      };

      const response = await resetForgotPassword(payload, String(resetToken));

      if (!response.success) {
        Alert.alert(
          "Đặt lại mật khẩu thất bại",
          response.message || "Vui lòng thử lại.",
        );
        return;
      }

      router.replace("/(auth)/login");
    } catch (error) {
      Alert.alert(
        "Đặt lại mật khẩu thất bại",
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
          Đặt lại mật khẩu
        </Text>
        <Text className="mt-2 text-slate-600">
          Nhập mật khẩu mới cho số điện thoại {phone ? String(phone) : ""}.
        </Text>

        <View className="mt-4">
          <FormInput
            control={control}
            name="password"
            label="Mật khẩu mới"
            icon="lock-outline"
            error={errors.password?.message}
            secureTextEntry
            placeholder="Nhập mật khẩu mới"
          />
          <FormInput
            control={control}
            name="confirmPassword"
            label="Xác nhận mật khẩu"
            icon="lock-check-outline"
            error={errors.confirmPassword?.message}
            secureTextEntry
            placeholder="Nhập lại mật khẩu mới"
          />
        </View>

        <Button
          title={isSubmitting ? "Đang cập nhật..." : "Đổi mật khẩu"}
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: 32 }}
        />
      </View>
    </SafeAreaView>
  );
}
