import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";

// Channel Android + pattern rung dùng riêng cho cảnh báo cần xử lý ngay (hết
// tiền, lỗi phần cứng, quên cắm sạc...) — khác biệt với thông báo thường để
// người dùng nhận ra ngay là cần xử lý.
export const CHARGE_ALERTS_CHANNEL_ID = "charge_alerts";
export const URGENT_VIBRATION_PATTERN = [0, 400, 200, 400, 200, 400];
const LOCAL_CHARGE_NOTIFICATION_ID = "enovo_charge_alert";

let isChargeDeviceCheckInProgress = false;
let pendingChargeStartedNotification = null;
let chargeNotificationNotBefore = 0;
let chargeDeviceMissingUntil = 0;
let manualChargeStopUntil = 0;

const CHARGE_NOTIFICATION_DELAY_MS = 2000;

export const setChargeDeviceCheckInProgress = (isChecking) => {
  isChargeDeviceCheckInProgress = Boolean(isChecking);
  if (isChecking) {
    pendingChargeStartedNotification = null;
    chargeNotificationNotBefore = 0;
    chargeDeviceMissingUntil = 0;
  }
};

const isChargeStartedNotification = (notification) => {

  const content = notification?.request?.content;
  const text = (
    String(content?.title || "") + " " + String(content?.body || "")
  ).toLowerCase();
  return (
    text.includes("đang sạc") ||
    text.includes("bắt đầu sạc") ||
    text.includes("bắt đầu phiên sạc") ||
    text.includes("sạc xe thành công")
  );
};

const isChargeFullNotification = (notification) => {
  const content = notification?.request?.content;
  const text = (
    String(content?.title || "") + " " + String(content?.body || "")
  ).toLowerCase();
  return text.includes("sạc đầy") || text.includes("đã đầy");
};

const scheduleChargeNotificationContent = async (content, delayMs) => {
  if (!content) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title,
      body: content.body,
      data: content.data || {},
      sound: content.sound || "default",
    },
    trigger: {
      seconds: Math.max(1, Math.ceil(delayMs / 1000)),
      channelId: CHARGE_ALERTS_CHANNEL_ID,
    },
  });
};

export const confirmChargeDeviceCheck = async () => {
  isChargeDeviceCheckInProgress = false;
  chargeNotificationNotBefore = Date.now() + CHARGE_NOTIFICATION_DELAY_MS;
  chargeDeviceMissingUntil = 0;
  const content = pendingChargeStartedNotification;
  pendingChargeStartedNotification = null;
  await scheduleChargeNotificationContent(content, CHARGE_NOTIFICATION_DELAY_MS);
};

export const wasChargeDeviceMissingRecently = () =>
  chargeDeviceMissingUntil > Date.now();

export const wasChargeStoppedManuallyRecently = () =>
  manualChargeStopUntil > Date.now();

export const beginManualChargeStop = () => {
  manualChargeStopUntil = Date.now() + 30 * 1000;
};

export const completeManualChargeStop = async () => {
  manualChargeStopUntil = Date.now() + 30 * 1000;
  await scheduleChargeNotificationContent(
    {
      title: "Đã dừng sạc xe",
      body: "Phiên sạc xe của bạn đã được dừng.",
    },
    0,
  );
};

export const cancelManualChargeStop = () => {
  manualChargeStopUntil = 0;
};

export const markChargeDeviceMissing = async () => {
  cancelPendingChargeNotification();
  chargeDeviceMissingUntil = Date.now() + 30 * 1000;
  await scheduleChargeNotificationContent(
    {
      title: "Không phát hiện thiết bị",
      body: "Vui lòng cắm thiết bị của bạn vào ổ sạc.",
    },
    0,
  );
};

export const cancelPendingChargeNotification = () => {
  isChargeDeviceCheckInProgress = false;
  pendingChargeStartedNotification = null;
  chargeNotificationNotBefore = 0;
};

// Cấu hình cách hiển thị notification khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    let shouldSuppress = false;
    if (
      (wasChargeDeviceMissingRecently() ||
        wasChargeStoppedManuallyRecently()) &&
      isChargeFullNotification(notification)
    ) {
      shouldSuppress = true;
    } else if (isChargeStartedNotification(notification)) {
      const content = notification?.request?.content;
      if (isChargeDeviceCheckInProgress) {
        pendingChargeStartedNotification = content;
        shouldSuppress = true;
      } else if (chargeNotificationNotBefore > Date.now()) {
        await scheduleChargeNotificationContent(
          content,
          chargeNotificationNotBefore - Date.now(),
        );
        shouldSuppress = true;
      }
    }
    // shouldShowAlert đã bị bỏ ở expo-notifications 0.32 (SDK 54) — thay bằng
    // cặp shouldShowBanner/shouldShowList, nếu không iOS sẽ không hiện banner
    // lúc app đang mở.
    return {
      shouldShowBanner: !shouldSuppress,
      shouldShowList: !shouldSuppress,
      shouldPlaySound: !shouldSuppress,
      shouldSetBadge: !shouldSuppress,
    };
  },
});

export async function registerForPushNotificationsAsync() {
  let token = null;

  // Bước 1: Kiểm tra thiết bị vật lý (không phải emulator)
  if (!Device.isDevice) {
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
    return null;
  }

  // Bước 5: Cấu hình channel cho Android — không cần push token/Firebase, nên
  // vẫn chạy được để local notification (âm thanh/rung cảnh báo phiên sạc)
  // hoạt động ngay cả khi chưa bật push thật.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHARGE_ALERTS_CHANNEL_ID, {
      name: "Cảnh báo phiên sạc",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: URGENT_VIBRATION_PATTERN,
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }

  // Bước 6: Lấy Expo Push Token thật. Yêu cầu google-services.json (Android/
  // FCM V1) + APNs (iOS) đã cấu hình và build lại app — đây là token backend
  // dùng để đẩy push khi app ở nền hoặc đã tắt hẳn (rung theo channel
  // charge_alerts đã tạo ở trên).
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      })
    ).data;
  } catch (error) {
    return null;
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
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    identifier: LOCAL_CHARGE_NOTIFICATION_ID,
    content: {
      title: title,
      body: body,
      data: data,
      sound: "default",
      color: "#31C861",
    },
    // channelId -> gửi ngay lập tức, đồng thời trên Android đi đúng qua
    // channel "charge_alerts" (âm thanh + vibrationPattern riêng); iOS bỏ
    // qua channelId, không ảnh hưởng.
    trigger: { channelId: CHARGE_ALERTS_CHANNEL_ID },
  });
}
