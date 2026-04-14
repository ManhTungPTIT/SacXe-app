import { useEffect, useRef, useState } from "react";
import {
  registerForPushNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from "../services/notification.service";

export const useNotifications = (enabled = false) => {
  // Expo Push Token - cần gửi lên backend để server biết gửi notification cho ai
  const [expoPushToken, setExpoPushToken] = useState(null);

  // Notification mới nhất nhận được
  const [notification, setNotification] = useState(null);

  // Refs để lưu subscription
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    if (!enabled) {
      setExpoPushToken(null);
      setNotification(null);
      return;
    }

    // 1. Đăng ký nhận push notification và lấy token
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
      }
    });

    // 2. Lắng nghe khi nhận notification (app đang mở)
    notificationListener.current = addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      },
    );

    // 3. Lắng nghe khi user tap vào notification
    responseListener.current = addNotificationResponseReceivedListener(
      () => {},
    );

    // Cleanup khi unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [enabled]);

  return {
    expoPushToken,
    notification,
  };
};
