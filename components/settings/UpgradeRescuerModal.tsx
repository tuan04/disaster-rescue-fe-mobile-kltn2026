import Button from "@/components/common/Button";
import FormInput from "@/components/common/FormInput";
import { upgradeToRescuer } from "@/services/user.service";
import type { RootState } from "@/store";
import type { UpgradeRescuerFormValues } from "@/types/user";
import { upgradeRescuerSchema } from "@/validations/userValidation";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { yupResolver } from "@hookform/resolvers/yup";
import React, { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, Text, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

export interface UpgradeRescuerModalProps {
  onDismiss?: () => void;
  onSuccess?: () => void;
}

export const UpgradeRescuerModal = React.forwardRef<
  BottomSheetModal,
  UpgradeRescuerModalProps
>(({ onDismiss, onSuccess }, ref) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<UpgradeRescuerFormValues>({
    resolver: yupResolver(upgradeRescuerSchema),
    defaultValues: {
      id: userId || "",
      CCCD: "",
    },
  });

  useEffect(() => {
    if (userId) {
      setValue("id", userId);
    }
  }, [userId, setValue]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    if (ref && "current" in ref && ref.current) {
      ref.current.dismiss();
    }
    reset({
      id: userId || "",
      CCCD: "",
    });
  }, [isSubmitting, ref, reset, userId]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const onSubmit = async (values: UpgradeRescuerFormValues) => {
    if (!values.id) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin tài khoản người dùng.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await upgradeToRescuer({
        id: values.id,
        CCCD: values.CCCD.trim(),
      });

      if (res.success) {
        handleClose();
        Alert.alert(
          "Gửi yêu cầu thành công",
          "Yêu cầu nâng cấp tài khoản Cứu hộ của bạn đã được tiếp nhận. Ban quản trị sẽ sớm duyệt yêu cầu của bạn.",
          [{ text: "Đã hiểu" }],
        );
        onSuccess?.();
      }
    } catch (error) {
      console.error("Upgrade rescuer error:", error);
      Alert.alert(
        "Không thể gửi yêu cầu",
        error instanceof Error
          ? error.message
          : "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing={true}
      backdropComponent={renderBackdrop}
      onDismiss={() => {
        reset({
          id: userId || "",
          CCCD: "",
        });
        onDismiss?.();
      }}
      backgroundStyle={{
        backgroundColor: theme.colors.surface,
      }}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.outline || "#9CA3AF",
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView
        style={{
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-800">
          <View className="flex-row items-center flex-1 mr-2">
            <View className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 items-center justify-center mr-3">
              <Ionicons name="shield-checkmark" size={22} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                Nâng cấp tài khoản
              </Text>
              <Text className="text-xs text-slate-500 dark:text-slate-400">
                Đăng ký tham gia đội cứu hộ
              </Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View className="p-4">
          <Text className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-5">
            Vui lòng cung cấp số Căn cước công dân (CCCD) chính xác để chúng tôi xác thực danh tính trước khi duyệt quyền Cứu hộ.
          </Text>

          {/* Form Input */}
          <FormInput
            control={control}
            name="CCCD"
            label="Số CCCD (12 chữ số)"
            keyboardType="number-pad"
            maxLength={12}
            error={errors.CCCD?.message}
          />

          {/* Info Banner */}
          <View className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex-row items-start">
            <Ionicons
              name="information-circle"
              size={18}
              color="#d97706"
              style={{ marginTop: 2 }}
            />
            <Text className="ml-2 text-xs text-amber-800 dark:text-amber-200 flex-1 leading-5">
              Sau khi gửi yêu cầu, ban quản trị sẽ kiểm tra thông tin và phê duyệt tài khoản cứu hộ của bạn.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3 mt-5">
            <Button
              title="Hủy"
              variant="outline"
              disabled={isSubmitting}
              onPress={handleClose}
              style={{ flex: 1 }}
            />
            <Button
              title={isSubmitting ? "Đang gửi..." : "Gửi yêu cầu"}
              loading={isSubmitting}
              onPress={handleSubmit(onSubmit)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

UpgradeRescuerModal.displayName = "UpgradeRescuerModal";

export default UpgradeRescuerModal;
