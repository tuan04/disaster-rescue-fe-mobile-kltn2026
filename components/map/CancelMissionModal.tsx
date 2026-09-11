import Button from "@/components/common/Button";
import { useAppTheme } from "@/contants/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

interface CancelMissionModalProps {
  visible: boolean;
  loading?: boolean;
  onDismiss: () => void;
  onConfirm: (reason: string) => void;
}

const QUICK_REASONS = [
  "Đường bị sạt lở / cô lập",
  "Phương tiện gặp sự cố",
  "Nạn nhân đã an toàn",
  "Không liên lạc được người báo",
  "Không thể tiếp cận hiện trường",
];

export default function CancelMissionModal({
  visible,
  loading = false,
  onDismiss,
  onConfirm,
}: CancelMissionModalProps) {
  const theme = useAppTheme();
  const [reason, setReason] = useState("");

  const handleSelectQuickReason = (selectedReason: string) => {
    setReason(selectedReason);
  };

  const handleConfirm = () => {
    if (!reason.trim() || loading) return;
    onConfirm(reason.trim());
  };

  const handleClose = () => {
    if (loading) return;
    setReason("");
    onDismiss();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 justify-center items-center bg-black/60 px-5"
      >
        <View
          style={{ backgroundColor: theme.colors.surface }}
          className="w-full rounded-xl p-5 shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center mb-3">
            <View className="flex-1">
              <Text className="text-lg font-bold text-danger">
                Xác nhận hủy ca cứu hộ
              </Text>
              <Text className="text-xs text-text-muted mt-0.5">
                Yêu cầu sẽ được chuyển về hàng đợi để đội khác tiếp nhận
              </Text>
            </View>
          </View>

          {/* Quick reasons chips */}
          <Text className="text-xs font-semibold text-text-muted mb-2">
            Chọn nhanh lý do hủy:
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {QUICK_REASONS.map((item) => {
              const isSelected = reason === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => handleSelectQuickReason(item)}
                  style={{
                    backgroundColor: isSelected
                      ? theme.colors.danger
                      : theme.colors.surfaceVariant,
                  }}
                  className="px-3 py-1.5 rounded-full border border-transparent active:opacity-80"
                >
                  <Text
                    style={{
                      color: isSelected ? "#ffffff" : theme.colors.onSurfaceVariant,
                    }}
                    className="text-xs font-medium"
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Reason Input */}
          <View className="mb-4">
            <TextInput
              multiline
              numberOfLines={3}
              value={reason}
              onChangeText={setReason}
              placeholder="Nhập lý do hủy chi tiết..."
              placeholderTextColor={theme.colors.outline}
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                color: theme.colors.onSurface,
                textAlignVertical: "top",
                minHeight: 70,
              }}
              className="p-3 rounded-2xl text-sm border border-gray-200 dark:border-gray-700"
            />
          </View>

          {/* Buttons */}
          <View className="flex-row gap-3">
            <Button
              title="Quay lại"
              variant="outline"
              onPress={handleClose}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <Button
              title="Hủy ca"
              variant="danger"
              onPress={handleConfirm}
              loading={loading}
              disabled={loading || !reason.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
