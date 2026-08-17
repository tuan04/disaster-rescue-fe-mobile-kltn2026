import { yupResolver } from "@hookform/resolvers/yup";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useDispatch } from "react-redux";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginAccount } from "@/services/auth.service";
import type { AppDispatch } from "@/store";
import { login } from "@/store/authSlice";
import type { LoginFormValues } from "@/types/auth";
import { loginSchema } from "@/validations/registerValidation";
import { saveTokens } from "@/helper/secureStore";

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

      Alert.alert("Đăng nhập thất bại", response.message || "Vui lòng thử lại.");
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Đăng nhập thất bại",
        error instanceof Error ? error.message : "Đã xảy ra lỗi, vui lòng thử lại.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 px-6 py-8">
        <View className="mb-6 items-end">
          <Pressable onPress={() => router.replace('/(app)')}>
            <Text className="text-base font-semibold text-slate-600">Bỏ qua</Text>
          </Pressable>
        </View>

        <View className="flex-1 justify-center">
          <Text className="text-3xl font-bold text-slate-900">Đăng nhập</Text>
          <Text className="mt-2 text-slate-600">
            Nhập số điện thoại và mật khẩu để tiếp tục.
          </Text>

        <Controller
          control={control}
          name="phoneNumber"
          render={({ field: { value, onChange, onBlur } }) => (
            <View className="mt-8">
              <Text className="mb-2 font-medium text-slate-700">Số điện thoại</Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="phone-pad"
                placeholder="Nhập số điện thoại"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                placeholderTextColor="#94a3b8"
              />
              {errors.phoneNumber?.message && (
                <Text className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <View className="mt-4">
              <Text className="mb-2 font-medium text-slate-700">Mật khẩu</Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                placeholder="Nhập mật khẩu"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                placeholderTextColor="#94a3b8"
              />
              {errors.password?.message && (
                <Text className="mt-1 text-sm text-red-600">{errors.password.message}</Text>
              )}
            </View>
          )}
        />

        <Pressable onPress={() => router.push("/auth/forgot-password")} className="mt-3 self-end">
          <Text className="font-semibold text-orange-600">Quên mật khẩu?</Text>
        </Pressable>

        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          className={`mt-8 rounded-xl py-4 ${isSubmitting ? "bg-orange-300" : "bg-orange-600"}`}
        >
          <Text className="text-center text-base font-bold text-white">
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Text>
        </Pressable>

          <Pressable onPress={() => router.push("/auth/register")} className="mt-5">
            <Text className="text-center text-slate-600">
              Chưa có tài khoản? <Text className="font-bold text-orange-600">Đăng ký</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
