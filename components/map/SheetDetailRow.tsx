import React from "react";
import { Text, View } from "react-native";

export interface SheetDetailRowProps {
  label: string;
  value?: React.ReactNode;
}

export default function SheetDetailRow({ label, value }: SheetDetailRowProps) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <View className="flex-row items-start justify-between py-2.5 border-b border-gray-100 dark:border-gray-800">
      <Text className="text-md font-medium text-text">
        {label}
      </Text>
      <View className="flex-1 items-end ml-4">
        {typeof value === "string" || typeof value === "number" ? (
          <Text className="text-md text-text text-right">
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

export { SheetDetailRow };
