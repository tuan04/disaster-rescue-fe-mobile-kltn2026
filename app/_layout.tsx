import { DarkTheme, LightTheme } from "@/contants/theme";
import { Stack } from "expo-router";
import { StatusBar, useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? DarkTheme : LightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={currentTheme}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(citizen)" />
          <Stack.Screen name="(rescue)" />
          <Stack.Screen name="auth/login" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
