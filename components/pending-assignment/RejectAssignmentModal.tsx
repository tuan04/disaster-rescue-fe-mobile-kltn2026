import Button from "@/components/common/Button";
import { useAppTheme } from "@/contants/theme";
import type { MapPointDetailRes } from "@/types/map";
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

export interface RejectAssignmentModalProps {
  visible: boolean;
  loading?: boolean;
  item: MapPointDetailRes | null;
  onDismiss: () => void;
  onConfirm: (reason?: string) => void;
}

const QUICK_REASONS = [
  "Đang bận nhiệm vụ khác",
  "Khoảng cách quá xa",
  "Không thể tiếp cận hiện trường",
  "Thiếu trang thiết bị phù hợp",
  "Phương tiện gặp sự cố",
];

export default function RejectAssignmentModal({
  visible,
  loading = false,
  item,
  onDismiss,
  onConfirm,
}: RejectAssignmentModalProps) {
  const theme = useAppTheme();
  const [reason, setReason] = useState("");

  const handleSelectQuickReason = (selectedReason: string) => {
    setReason((prev) => {
      if (!prev.trim()) return selectedReason;
      if (prev.includes(selectedReason)) return prev;
      return `${prev}, ${selectedReason}`;
    });
  };

  const handleConfirm = () => {
    if (loading) return;
    onConfirm(reason.trim() || undefined);
  };

  const handleClose = () => {
    if (loading) return;
    setReason("");
    onDismiss();
  };

  const address = item?.address;
  const phone =
    item?.pointType === "SOS" ? item.detail.reporterPhone : undefined;

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
          className="w-full rounded-2xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800"
        >
          {/* Header */}
          <View className="flex-row items-center mb-3">
            <View className="h-10 w-10 rounded-full bg-red-500/15 items-center justify-center mr-3">
              <Ionicons
                name="close-circle-outline"
                size={22}
                color={theme.colors.danger}
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-red-600 dark:text-red-400">
                Từ chối nhận nhiệm vụ
              </Text>
              <Text className="text-[11px] text-textMuted mt-0.5">
                Yêu cầu sẽ được chuyển về hàng đợi để điều phối cho đội khác
              </Text>
            </View>
          </View>

          {/* Thông tin vắn tắt nhiệm vụ */}
          {(address || phone) && (
            <View className="mb-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-800">
              {address ? (
                <View className="flex-row items-center mb-1">
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={theme.colors.primary}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    className="flex-1 text-xs text-text font-medium"
                    numberOfLines={1}
                  >
                    {address}
                  </Text>
                </View>
              ) : null}
              {phone ? (
                <View className="flex-row items-center">
                  <Ionicons
                    name="call-outline"
                    size={13}
                    color={theme.colors.textMuted}
                    style={{ marginRight: 4 }}
                  />
                  <Text className="text-xs text-textMuted font-medium">
                    SĐT người báo: {phone}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Quick reasons chips */}
          <Text className="text-xs font-semibold text-textMuted mb-2">
            Chọn nhanh lý do từ chối:
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {QUICK_REASONS.map((r) => {
              const isSelected = reason.includes(r);
              return (
                <Pressable
                  key={r}
                  onPress={() => handleSelectQuickReason(r)}
                  style={{
                    backgroundColor: isSelected
                      ? theme.colors.danger
                      : theme.colors.surfaceVariant,
                  }}
                  className="px-3 py-1.5 rounded-full border border-transparent active:opacity-80"
                >
                  <Text
                    style={{
                      color: isSelected ? "#ffffff" : theme.colors.text,
                    }}
                    className="text-xs font-medium"
                  >
                    {r}
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
              placeholder="Nhập lý do từ chối chi tiết (tùy chọn)..."
              placeholderTextColor={theme.colors.outline}
              style={{
                backgroundColor: theme.colors.surfaceVariant,
                color: theme.colors.onSurface,
                textAlignVertical: "top",
                minHeight: 70,
              }}
              className="p-3 rounded-xl text-xs border border-gray-200 dark:border-gray-700"
            />
          </View>

          {/* Action Buttons */}
          <View className="flex-row gap-3">
            <Button
              title="Quay lại"
              variant="outline"
              onPress={handleClose}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <Button
              title="Xác nhận từ chối"
              variant="danger"
              onPress={handleConfirm}
              loading={loading}
              disabled={loading}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
