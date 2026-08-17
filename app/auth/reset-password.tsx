import { yupResolver } from '@hookform/resolvers/yup';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetForgotPassword } from '@/services/auth.service';
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/validations/forgotPasswordValidation';

export default function ResetPasswordScreen() {
  const { resetToken, phone } = useLocalSearchParams<{ resetToken?: string; phone?: string }>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      phone: String(phone ?? ''),
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    if (!resetToken || !phone) {
      Alert.alert('Thiếu dữ liệu', 'Vui lòng thực hiện lại luồng quên mật khẩu từ đầu.');
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
        Alert.alert('Đặt lại mật khẩu thất bại', response.message || 'Vui lòng thử lại.');
        return;
      }

      router.replace('/auth/login');
    } catch (error) {
      Alert.alert(
        'Đặt lại mật khẩu thất bại',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6 py-8">
        <Text className="text-3xl font-bold text-slate-900">Đặt lại mật khẩu</Text>
        <Text className="mt-2 text-slate-600">Nhập mật khẩu mới cho số điện thoại {phone ? String(phone) : ''}.</Text>

        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <View className="mt-8">
              <Text className="mb-2 font-medium text-slate-700">Mật khẩu mới</Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                placeholder="Nhập mật khẩu mới"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                placeholderTextColor="#94a3b8"
              />
              {errors.password?.message && (
                <Text className="mt-1 text-sm text-red-600">{errors.password.message}</Text>
              )}
            </View>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { value, onChange, onBlur } }) => (
            <View className="mt-4">
              <Text className="mb-2 font-medium text-slate-700">Xác nhận mật khẩu</Text>
              <TextInput
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                placeholder="Nhập lại mật khẩu mới"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                placeholderTextColor="#94a3b8"
              />
              {errors.confirmPassword?.message && (
                <Text className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</Text>
              )}
            </View>
          )}
        />

        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          className={`mt-8 rounded-xl py-4 ${isSubmitting ? 'bg-orange-300' : 'bg-orange-600'}`}
        >
          <Text className="text-center text-base font-bold text-white">
            {isSubmitting ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}