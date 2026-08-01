import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./navigation/RootNavigator";
import { QueryProvider } from "./providers/QueryProvider";
import { useNotifications } from "./hooks/useNotifications";
import { useEffect } from "react";
import { notificationApi } from "./api/notification.api";
import { useAuthStore } from "./stores/auth.store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SocketProvider } from "./providers/SocketProvider";

const PUSH_TOKEN_KEY = "@registered_push_token";

// Component con để sử dụng hook (hooks chỉ dùng được trong function components)
function AppContent() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { expoPushToken } = useNotifications(true);

  // Khi có token VÀ đã đăng nhập, gửi lên backend (chỉ khi token thay đổi)
  useEffect(() => {
    if (!expoPushToken || !isAuthenticated) return;

    const registerTokenIfNeeded = async () => {
      try {
        // Kiểm tra token đã đăng ký trước đó
        const savedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

        // Nếu token giống nhau, không cần gửi lại
        if (savedToken === expoPushToken) {
          return;
        }

        // Token mới hoặc thay đổi, gửi lên server
        await notificationApi.registerPushToken(expoPushToken);

        // Lưu token đã đăng ký thành công
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoPushToken);
      } catch (err) {
        console.error("Lỗi đăng ký push token:", {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        // Không lưu token nếu gửi thất bại, để lần sau thử lại
      }
    };

    registerTokenIfNeeded();
  }, [expoPushToken, isAuthenticated]);

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryProvider>
  );
}
