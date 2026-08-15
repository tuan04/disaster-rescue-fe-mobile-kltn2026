import { yupResolver } from '@hookform/resolvers/yup';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { verifyForgotPasswordOtp } from '@/services/auth.service';
import {
  verifyResetOtpSchema,
  type VerifyResetOtpFormValues,
} from '@/validations/forgotPasswordValidation';

export default function VerifyResetOtpScreen() {
  const { id, phoneNumber } = useLocalSearchParams<{ id?: string; phoneNumber?: string }>();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyResetOtpFormValues>({
    resolver: yupResolver(verifyResetOtpSchema),
    defaultValues: {
      otp: '',
    },
  });

  const onSubmit = async (values: VerifyResetOtpFormValues) => {
    if (!id || !phoneNumber) {
      Alert.alert('Thiếu dữ liệu', 'Vui lòng quay lại bước nhập số điện thoại.');
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
        Alert.alert('Xác thực OTP thất bại', response.message || 'Vui lòng thử lại.');
        return;
      }

      router.push({
        pathname: '/auth/reset-password',
        params: {
          resetToken: response.data.resetToken,
          phone: String(phoneNumber),
        },
      });
    } catch (error) {
      Alert.alert(
        'Xác thực OTP thất bại',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6 py-8">
        <Text className="text-3xl font-bold text-slate-900">Xác thực OTP</Text>
        <Text className="mt-2 text-slate-600">
          Nhập mã OTP 6 số đã gửi đến {phoneNumber ? String(phoneNumber) : 'số điện thoại của bạn'}.
        </Text>

        <Controller
          control={control}
          name="otp"
          render={({ field: { value, onChange, onBlur } }) => (
            <View className="mt-8">
              <Text className="mb-2 font-medium text-slate-700">Mã OTP</Text>
              <TextInput
                value={value}
                onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, 6))}
                onBlur={onBlur}
                keyboardType="number-pad"
                placeholder="Nhập mã OTP"
                maxLength={6}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900"
                placeholderTextColor="#94a3b8"
              />
              {errors.otp?.message && (
                <Text className="mt-1 text-sm text-red-600">{errors.otp.message}</Text>
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
            {isSubmitting ? 'Đang xác thực...' : 'Xác thực OTP'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}