import { customToastConfig } from "@/components/common/CustomToast";
import SosAlertModal from "@/components/common/SosAlertModal";
import { DarkTheme, LightTheme } from "@/contants/theme";
import { DATABASE_NAME, migrateDbIfNeeded } from "@/database";
import { useTeamLocationTracking } from "@/hooks/useTeamLocationTracking";
import { clearTokens, getAccessToken } from "@/helper/secureStore";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { getCurrentUser } from "@/services/auth.service";
import type { AppDispatch, RootState } from "@/store";
import { store } from "@/store";
import { login, logout } from "@/store/authSlice";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { useEffect } from "react";
import { StatusBar, useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { Provider, useDispatch, useSelector } from "react-redux";
import "../global.css";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <SQLiteProvider
            databaseName={DATABASE_NAME}
            onInit={migrateDbIfNeeded}
            useSuspense={false}
          >
            <RootNavigator />
          </SQLiteProvider>
        </Provider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === "dark" ? DarkTheme : LightTheme;
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const user = useSelector((state: RootState) => state.auth?.user);
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth?.isAuthenticated,
  );

  // kích hoạt theo dõi vị trí khi user có role LEADER
  useTeamLocationTracking();
  // Kích hoạt WebSocket STOMP lắng nghe thông báo thời gian thực từ notification-service
  useNotificationSocket();

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        if (user || isAuthenticated) {
          return;
        }
        const token = await getAccessToken();
        if (!token) {
          dispatch(logout());
          return;
        }

        const response = await getCurrentUser(token);
        if (response.success && response.data) {
          dispatch(login(response.data));
          return;
        }

        await clearTokens();
        dispatch(logout());
      } catch {
        await clearTokens();
        dispatch(logout());
      }
    };

    bootstrapAuth();
  }, [dispatch, isAuthenticated, user]);

  useEffect(() => {
    const firstSegment = segments[0];
    const inAuthScreen = firstSegment === "(auth)";

    if (isAuthenticated && (pathname === "/" || inAuthScreen)) {
      router.replace("/(app)");
      return;
    }
  }, [isAuthenticated, pathname, router, segments]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={currentTheme}>
        <BottomSheetModalProvider>
          <StatusBar
            barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
          />

          <View
            className={
              colorScheme === "dark"
                ? "dark flex-1 bg-background"
                : "flex-1 bg-background"
            }
          >
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(app)" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(pages)" />
            </Stack>
          </View>
          {/* Modal cảnh báo cứu hộ khẩn cấp thời gian thực */}
          <SosAlertModal />
          <Toast config={customToastConfig} />
        </BottomSheetModalProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
