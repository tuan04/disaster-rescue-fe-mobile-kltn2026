import { yupResolver } from '@hookform/resolvers/yup';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { forgotPasswordSendOtp } from '@/services/auth.service';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/validations/forgotPasswordValidation';

export default function ForgotPasswordScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      const payload = { phoneNumber: values.phoneNumber.trim() };
      const response = await forgotPasswordSendOtp(payload);

      if (!response.success || !response.data?.id) {
        Alert.alert('Không thể gửi OTP', response.message || 'Vui lòng thử lại.');
        return;
      }

      router.push({
        pathname: '/auth/verify-reset-otp',
        params: {
          phoneNumber: payload.phoneNumber,
          id: response.data.id,
        },
      });
    } catch (error) {
      Alert.alert(
        'Không thể gửi OTP',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6 py-8">
        <Text className="text-3xl font-bold text-slate-900">Quên mật khẩu</Text>
        <Text className="mt-2 text-slate-600">Nhập số điện thoại để nhận mã OTP khôi phục mật khẩu.</Text>

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

        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit(onSubmit)}
          className={`mt-8 rounded-xl py-4 ${isSubmitting ? 'bg-orange-300' : 'bg-orange-600'}`}
        >
          <Text className="text-center text-base font-bold text-white">
            {isSubmitting ? 'Đang gửi OTP...' : 'Gửi mã OTP'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/auth/login')} className="mt-5">
          <Text className="text-center text-slate-600">
            Quay lại <Text className="font-bold text-orange-600">Đăng nhập</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}