import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "../providers/queryClient";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "auth_user";

const clearAsyncStorageSafely = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();

    if (!keys?.length) {
      return;
    }

    // Tránh AsyncStorage.clear() trên iOS vì có thể lỗi xóa thư mục storage.
    try {
      await AsyncStorage.multiRemove(keys);
    } catch {
      await Promise.allSettled(keys.map((key) => AsyncStorage.removeItem(key)));
    }
  } catch {
    // Bỏ qua để không làm hỏng luồng logout.
  }
};

export const useAuthStore = create((set, get) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,

  // Đăng nhập: lưu tokens và user
  login: async (accessToken, refreshToken, user) => {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      if (user) {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      }
      set({
        isAuthenticated: true,
        accessToken,
        refreshToken,
        user,
        isLoading: false,
      });
    } catch (error) {
    }
  },

  // Cập nhật access token mới sau khi refresh
  setAccessToken: async (accessToken) => {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      set({ accessToken });
    } catch (error) {
    }
  },

  // Lấy refresh token
  getRefreshToken: async () => {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      return null;
    }
  },

  // Đăng xuất
  logout: async () => {
    try {
      // Dừng request/query đang chạy rồi xóa toàn bộ cache react-query
      await queryClient.cancelQueries();
      queryClient.clear();

      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);

      // Xóa toàn bộ key lưu trong AsyncStorage theo cách an toàn.
      await clearAsyncStorageSafely();
    } catch (error) {
    } finally {
      set({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        user: null,
      });
    }
  },

  // Khởi tạo: check token khi mở app
  initialize: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      const userString = await SecureStore.getItemAsync(USER_KEY);
      const user = userString ? JSON.parse(userString) : null;

      if (accessToken && refreshToken) {
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken,
          user,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));
