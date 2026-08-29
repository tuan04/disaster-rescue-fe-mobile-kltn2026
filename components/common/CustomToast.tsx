import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { BaseToastProps } from "react-native-toast-message";

export const customToastConfig = {
  success: ({ text1, text2 }: BaseToastProps) => (
    <View className="w-[92%] max-w-[420px] bg-emerald-600 dark:bg-emerald-700 px-4 py-3.5 rounded-2xl flex-row items-center shadow-lg border border-emerald-400/30">
      <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
        <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
      </View>
      <View className="flex-1 justify-center">
        {text1 && (
          <Text className="text-white font-bold text-[15px] leading-5">
            {text1}
          </Text>
        )}
        {text2 && (
          <Text className="text-emerald-100 text-[13px] mt-0.5 leading-4 font-normal">
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),

  error: ({ text1, text2 }: BaseToastProps) => (
    <View className="w-[92%] max-w-[420px] bg-red-600 dark:bg-red-700 px-4 py-3.5 rounded-2xl flex-row items-center shadow-lg border border-red-400/30">
      <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
        <Ionicons name="alert-circle" size={24} color="#ffffff" />
      </View>
      <View className="flex-1 justify-center">
        {text1 && (
          <Text className="text-white font-bold text-[15px] leading-5">
            {text1}
          </Text>
        )}
        {text2 && (
          <Text className="text-red-100 text-[13px] mt-0.5 leading-4 font-normal">
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),

  warning: ({ text1, text2 }: BaseToastProps) => (
    <View className="w-[92%] max-w-[420px] bg-amber-500 dark:bg-amber-600 px-4 py-3.5 rounded-2xl flex-row items-center shadow-lg border border-amber-300/30">
      <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
        <Ionicons name="warning" size={24} color="#ffffff" />
      </View>
      <View className="flex-1 justify-center">
        {text1 && (
          <Text className="text-white font-bold text-[15px] leading-5">
            {text1}
          </Text>
        )}
        {text2 && (
          <Text className="text-amber-100 text-[13px] mt-0.5 leading-4 font-normal">
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),

  info: ({ text1, text2 }: BaseToastProps) => (
    <View className="w-[92%] max-w-[420px] bg-sky-600 dark:bg-sky-700 px-4 py-3.5 rounded-2xl flex-row items-center shadow-lg border border-sky-400/30">
      <View className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-3">
        <Ionicons name="information-circle" size={24} color="#ffffff" />
      </View>
      <View className="flex-1 justify-center">
        {text1 && (
          <Text className="text-white font-bold text-[15px] leading-5">
            {text1}
          </Text>
        )}
        {text2 && (
          <Text className="text-sky-100 text-[13px] mt-0.5 leading-4 font-normal">
            {text2}
          </Text>
        )}
      </View>
    </View>
  ),
};
