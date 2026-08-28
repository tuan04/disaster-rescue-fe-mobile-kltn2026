import React from "react";
import { Text, View } from "react-native";

interface SettingSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SettingSection({
  title,
  children,
  className = "",
}: SettingSectionProps) {
  return (
    <View className={`mb-5 ${className}`}>
      {title ? (
        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
          {title}
        </Text>
      ) : null}
      <View className="bg-surface rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
        {children}
      </View>
    </View>
  );
}
