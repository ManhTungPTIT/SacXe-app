import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Cấu hình cách hiển thị notification khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Hiện alert
    shouldPlaySound: true, // Phát âm thanh
    shouldSetBadge: true, // Hiện badge trên icon app
  }),
});

export async function registerForPushNotificationsAsync() {
  let token = null;

  // Bước 1: Kiểm tra thiết bị vật lý (không phải emulator)
  if (!Device.isDevice) {
    console.warn("Push notifications chỉ hoạt động trên thiết bị thật!");
    return null;
  }

  // Bước 2: Kiểm tra quyền hiện tại
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Bước 3: Nếu chưa có quyền, yêu cầu quyền
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Bước 4: Nếu không được cấp quyền, thoát
  if (finalStatus !== "granted") {
    console.warn("Người dùng từ chối quyền notification!");
    return null;
  }

  // Bước 5: Lấy Expo Push Token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })
    ).data;
  } catch (error) {
    console.error("Lỗi khi lấy push token:", error);
    return null;
  }

  // Bước 6: Cấu hình channel cho Android
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Thông báo mặc định",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }

  return token;
}

export function addNotificationReceivedListener(callback) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(callback) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function sendLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: data,
      sound: "default",
    },
    trigger: null, // null = gửi ngay lập tức
  });
}
