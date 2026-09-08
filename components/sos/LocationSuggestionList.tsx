import type { LocationIQSuggestion } from "@/types/sos";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

interface LocationSuggestionListProps {
  suggestions: LocationIQSuggestion[];
  onSelectSuggestion: (suggestion: LocationIQSuggestion) => void;
}

export const LocationSuggestionList: React.FC<LocationSuggestionListProps> = ({
  suggestions,
  onSelectSuggestion,
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View
      style={{ maxHeight: 260 }}
      className="mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
    >
      <ScrollView
        nestedScrollEnabled={true}
        disallowInterruption={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        persistentScrollbar={true}
        style={{ maxHeight: 230 }}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {suggestions.map((item, index) => {
          const safeTitle =
            item.display_place ||
            item.address?.name ||
            item.display_name?.split(",")[0] ||
            "Địa điểm";

          return (
            <Pressable
              key={`${item.place_id || "sug"}-${index}`}
              onPress={() => onSelectSuggestion(item)}
              className={`flex-row items-start p-3 active:bg-red-50 dark:active:bg-red-950/40 ${
                index < suggestions.length - 1
                  ? "border-b border-gray-100 dark:border-gray-700"
                  : ""
              }`}
            >
              <Ionicons
                name="location-sharp"
                size={18}
                color="#dc2626"
                style={{ marginTop: 2, marginRight: 8 }}
              />
              <View className="flex-1">
                <Text
                  className="text-xs font-bold leading-4 text-text"
                  numberOfLines={1}
                >
                  {safeTitle}
                </Text>
                <Text
                  className="mt-0.5 text-[11px] leading-4 text-textMuted"
                  numberOfLines={2}
                >
                  {item.display_name}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {suggestions.length > 3 && (
        <View className="flex-row items-center justify-center border-t border-gray-100 bg-gray-50 py-1.5 dark:border-gray-700 dark:bg-gray-800/80">
          <Ionicons name="swap-vertical" size={13} color="#94a3b8" />
          <Text className="ml-1 text-[10px] font-medium text-textMuted">
            Cuộn để xem thêm kết quả
          </Text>
        </View>
      )}
    </View>
  );
};

export default LocationSuggestionList;
