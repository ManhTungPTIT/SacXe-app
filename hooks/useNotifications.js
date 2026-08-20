import { useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";
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

    // Chặn set state khi user đã logout / component unmount giữa lúc chờ
    // người dùng trả lời hộp thoại quyền (có thể mất vài giây).
    let isActive = true;

    // 1. Đăng ký nhận push notification và lấy token.
    // Hoãn tới khi animation chuyển sang màn chính chạy xong mới xin quyền —
    // hộp thoại của hệ điều hành sẽ đè lên màn chính thay vì bật giữa lúc
    // đang chuyển màn.
    const permissionTask = InteractionManager.runAfterInteractions(() => {
      if (!isActive) return;

      registerForPushNotificationsAsync()
        .then((token) => {
          if (isActive && token) {
            setExpoPushToken(token);
          }
        })
        .catch((error) => {
          // Nuốt lỗi có chủ đích: không lấy được push token thì app vẫn chạy
          // bình thường, chỉ là không nhận được thông báo đẩy. Trạng thái quyền
          // được hiển thị và xử lý ở màn Cài đặt → Thông báo
          // (components/settings/NotificationComponent.js), nên chỗ này không
          // cần báo gì ra ngoài.
        });
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

    // Cleanup khi unmount / khi logout (enabled -> false)
    return () => {
      isActive = false;
      permissionTask.cancel();
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
