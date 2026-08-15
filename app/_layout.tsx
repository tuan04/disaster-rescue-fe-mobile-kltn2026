import "../global.css";
import { DarkTheme, LightTheme } from "@/contants/theme";
import { clearTokens, getAccessToken } from "@/helper/secureStore";
import { getCurrentUser } from "@/services/auth.service";
import { login, logout } from "@/store/authSlice";
import type { AppDispatch, RootState } from "@/store";
import { store } from "@/store";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar, useColorScheme, View } from "react-native";
import { Provider , useDispatch, useSelector} from "react-redux";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const currentTheme = colorScheme === 'dark' ? DarkTheme : LightTheme;
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const user = useSelector((state: RootState) => state.auth?.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth?.isAuthenticated);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;

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
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, [dispatch, user]);

  useEffect(() => {
    if (isCheckingAuth) {
      return;
    }

    const firstSegment = segments[0];
    const inAuthScreen = firstSegment === 'auth';
    const inAppScreen = firstSegment === '(app)';

    if (isAuthenticated && (pathname === '/' || inAuthScreen)) {
      router.replace('/(app)');
      return;
    }

  }, [isAuthenticated, isCheckingAuth, pathname, router, segments]);
  
  return (
    <SafeAreaProvider>
      <PaperProvider theme={currentTheme}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

        {isCheckingAuth ? (
          <View className="flex-1 bg-slate-50" />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="auth/otp-verification" />
            <Stack.Screen name="auth/forgot-password" />
            <Stack.Screen name="auth/verify-reset-otp" />
            <Stack.Screen name="auth/reset-password" />
          </Stack>
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
