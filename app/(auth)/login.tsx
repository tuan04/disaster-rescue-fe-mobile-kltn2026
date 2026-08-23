import Button from "@/components/common/Button";
import FormInput from "@/components/common/FormInput";
import ScreenContainer from "@/components/common/ScreenContainer";
import TextLink from "@/components/common/TextLink";
import { saveTokens } from "@/helper/secureStore";
import { loginAccount } from "@/services/auth.service";
import type { AppDispatch } from "@/store";
import { login } from "@/store/authSlice";
import type { LoginFormValues } from "@/types/auth";
import { loginSchema } from "@/validations/registerValidation";
import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { useForm } from "react-hook-form";
import { Alert, Text, View } from "react-native";
import { useDispatch } from "react-redux";

export default function LoginScreen() {
  const dispatch = useDispatch<AppDispatch>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      phoneNumber: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await loginAccount({
        phoneNumber: values.phoneNumber.trim(),
        password: values.password,
      });

      if (response.success === true) {
        await saveTokens(response.data.accessToken, response.data.refreshToken);
        dispatch(login(response.data.userInfoResponse));
        router.replace("/(app)");
        return;
      }

      Alert.alert(
        "Đăng nhập thất bại",
        response.message || "Vui lòng thử lại.",
      );
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Đăng nhập thất bại",
        error instanceof Error
          ? error.message
          : "Đã xảy ra lỗi, vui lòng thử lại.",
      );
    }
  };

  return (
    <ScreenContainer>
      <View className="mb-6 items-end">
        <TextLink
          title="Bỏ qua"
          align="right"
          onPress={() => router.replace("/(app)")}
        />
      </View>

      <View className="flex-1 justify-center">
        <Text className="text-3xl font-bold text-slate-900">Đăng nhập</Text>
        <Text className="mt-2 text-slate-600">
          Nhập số điện thoại và mật khẩu để tiếp tục.
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
          <FormInput
            control={control}
            name="password"
            label="Mật khẩu"
            icon="lock-outline"
            error={errors.password?.message}
            secureTextEntry
            placeholder="Nhập mật khẩu"
          />
        </View>

        <TextLink
          title="Quên mật khẩu?"
          align="right"
          onPress={() => router.push("/(auth)/forgot-password")}
          style={{ marginTop: 12 }}
        />

        <Button
          title={isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          style={{ marginTop: 32 }}
        />

        <TextLink
          text="Chưa có tài khoản?"
          title="Đăng ký"
          onPress={() => router.push("/(auth)/register")}
          style={{ marginTop: 20 }}
        />
      </View>
    </ScreenContainer>
  );
}
