import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

export interface ReliefSupplyItem {
  id: string;
  label: string;
}

export const RELIEF_SUPPLIES: ReliefSupplyItem[] = [
  { id: "food", label: "Lương thực, thực phẩm" },
  { id: "water", label: "Nước uống sạch" },
  { id: "medical", label: "Thuốc men, y tế" },
  { id: "lifejacket", label: "Áo phao cứu sinh" },
  { id: "flashlight", label: "Đèn pin, sạc dự phòng" },
  { id: "baby", label: "Sữa, tã (trẻ em / người già)" },
  { id: "clothes", label: "Quần áo, chăn ấm" },
  { id: "boat", label: "Xuồng / ca nô di tản" },
];

interface ReliefSupplySelectorProps {
  selectedSupplies: string[];
  onToggleSupply: (supply: string) => void;
  onClearAll?: () => void;
}

export const ReliefSupplySelector: React.FC<ReliefSupplySelectorProps> = ({
  selectedSupplies,
  onToggleSupply,
  onClearAll,
}) => {
  return (
    <View className="mt-2 mb-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-sm font-bold text-text">
          Nhu yếu phẩm cần hỗ trợ{" "}
          {selectedSupplies.length > 0 && (
            <Text className="text-xs font-semibold text-red-600">
              (Đã chọn {selectedSupplies.length})
            </Text>
          )}
        </Text>
        {selectedSupplies.length > 0 && onClearAll && (
          <Pressable onPress={onClearAll} className="active:opacity-70">
            <Text className="text-xs font-medium text-textMuted underline">
              Bỏ chọn tất cả
            </Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row flex-wrap -mx-1">
        {RELIEF_SUPPLIES.map((item) => {
          const isSelected = selectedSupplies.includes(item.label);
          return (
            <View key={item.id} className="w-1/2 p-1">
              <Pressable
                onPress={() => onToggleSupply(item.label)}
                className={`flex-row items-center rounded-xl border p-2.5 min-h-[46px] active:opacity-80 ${
                  isSelected
                    ? "border-red-500 bg-red-50 dark:border-red-600 dark:bg-red-950/40"
                    : "border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-800/60"
                }`}
              >
                <Ionicons
                  name={isSelected ? "checkbox" : "square-outline"}
                  size={19}
                  color={isSelected ? "#dc2626" : "#94a3b8"}
                />
                <Text
                  className={`ml-2 flex-1 text-xs leading-4 ${
                    isSelected
                      ? "font-bold text-red-700 dark:text-red-300"
                      : "font-medium text-text"
                  }`}
                  numberOfLines={2}
                >
                  {item.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default ReliefSupplySelector;
