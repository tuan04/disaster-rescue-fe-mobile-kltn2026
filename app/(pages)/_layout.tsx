import { Stack } from "expo-router";
import React from "react";

export default function PagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sos-point" />
      <Stack.Screen name="hazard-point" />
      <Stack.Screen name="safe-point" />
      <Stack.Screen name="warehouse-point" />
    </Stack>
  );
}
