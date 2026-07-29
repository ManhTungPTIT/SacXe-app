import { useEffect, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  Alert,
  Vibration,
} from "react-native";
import { useAuthStore } from "../stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";

import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import FeedbackScreen from "../screens/FeedbackScreen";
import { socket } from "../services/socket.service";
import { useHistory } from "../queries/history.query";
import { Colors } from "../constants/color";
import ToastNotification from "../components/ToastNotification";
import {
  sendLocalNotification,
  URGENT_VIBRATION_PATTERN,
  wasChargeDeviceMissingRecently,
  wasChargeStoppedManuallyRecently,
} from "../services/notification.service";

// Rung + phát local notification cho các cảnh báo CẦN người dùng xử lý ngay
// (hết tiền, lỗi phần cứng, quên cắm sạc...) — khác với Toast/Alert thường
// (chỉ hiện chữ, không rung/kêu). Không dùng cho "sạc đầy" (tin tốt, không
// cần xử lý gấp).
const triggerUrgentAlert = (title, message) => {
  Vibration.vibrate(URGENT_VIBRATION_PATTERN);
  sendLocalNotification(title, message).catch(() => {});
};

const Stack = createNativeStackNavigator();

const normalizeId = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
};

const RootNavigator = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialize = useAuthStore((state) => state.initialize);
  const userId = useAuthStore((state) => state.user?._id);
  const { data: latestHistory } = useHistory.useGetLatestHistory();
  const serverStopAlertsRef = useRef(new Set());
  const deviceStatusAlertsRef = useRef(new Set());
  const [toastVisible, setToastVisible] = useState(false);
  const [toastTitle, setToastTitle] = useState("Thông báo");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [toastDuration, setToastDuration] = useState(5000);

  // Clear alert dedup khi phiên sạc thay đổi để tránh suppress alerts cho phiên mới
  useEffect(() => {
    serverStopAlertsRef.current.clear();
    deviceStatusAlertsRef.current.clear();
  }, [latestHistory?._id]);

  // Khởi tạo auth state khi mở app
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      socket.connect();
      // join vào room của user để nhận thông báo
      if (userId) {
        if (latestHistory?._id && !latestHistory?.totalTime && !latestHistory?.clientSessionStopped) {
          socket.emit(
            "telemetry_data",
            `user_${userId}_${latestHistory.deviceId?.deviceCode}_${latestHistory.powerId?.index}`,
          );
        }
        socket.emit("transaction_update", userId); // Báo server cho join vào room userId
      }
    } else {
      socket.disconnect();
    }
    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, userId, latestHistory]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return;
    }

    const joinRooms = () => {
      if (latestHistory?._id && !latestHistory?.totalTime && !latestHistory?.clientSessionStopped) {
        socket.emit(
          "telemetry_data",
          `user_${userId}_${latestHistory.deviceId?.deviceCode}_${latestHistory.powerId?.index}`,
        );
      }
      socket.emit("transaction_update", userId);
    };

    // Trong lúc socket rớt, mọi sự kiện bắn tới room đều mất hẳn — socket.io
    // không phát lại. Số dư đổi trong khoảng đó (admin duyệt giao dịch, phiên
    // sạc trừ tiền) sẽ không bao giờ tới nơi. Nạp lại khi kết nối trở lại.
    const resyncAfterReconnect = () => {
      joinRooms();
      queryClient.invalidateQueries({ queryKey: ["ME"] });
      queryClient.invalidateQueries({ queryKey: ["TRANSACTION_HISTORY"] });
    };

    // Join ngay + join lại mỗi lần reconnect
    joinRooms();
    socket.on("connect", resyncAfterReconnect);

    return () => {
      socket.off("connect", resyncAfterReconnect);
    };
  }, [isAuthenticated, userId, latestHistory, queryClient]);

  useEffect(() => {
    const upsertTransactionHistory = (status, transaction) => {
      queryClient.setQueryData(["TRANSACTION_HISTORY", status], (oldData) => {
        const currentHistory = Array.isArray(oldData?.history)
          ? oldData.history
          : Array.isArray(oldData)
            ? oldData
            : [];

        const nextHistory = [
          transaction,
          ...currentHistory.filter((item) => item?._id !== transaction._id),
        ];

        if (Array.isArray(oldData)) {
          return nextHistory;
        }

        return {
          ...(oldData || {}),
          history: nextHistory,
        };
      });
    };

    const removeTransactionFromHistory = (status, transactionId) => {
      queryClient.setQueryData(["TRANSACTION_HISTORY", status], (oldData) => {
        const currentHistory = Array.isArray(oldData?.history)
          ? oldData.history
          : Array.isArray(oldData)
            ? oldData
            : [];

        const nextHistory = currentHistory.filter(
          (item) => item?._id !== transactionId,
        );

        if (Array.isArray(oldData)) {
          return nextHistory;
        }

        return {
          ...(oldData || {}),
          history: nextHistory,
        };
      });
    };

    const updateCachedBalance = (nextBalance) => {
      const numericBalance = Number(nextBalance);

      if (!Number.isFinite(numericBalance)) {
        queryClient.invalidateQueries({ queryKey: ["ME"] });
        return;
      }

      const currentMeData = queryClient.getQueryData(["ME"]);
      const fallbackUser = currentMeData?.user || useAuthStore.getState().user;

      if (!fallbackUser) {
        queryClient.invalidateQueries({ queryKey: ["ME"] });
        return;
      }

      queryClient.setQueryData(["ME"], (oldData) => {
        const currentUser = oldData?.user || fallbackUser;

        return {
          ...(oldData || {}),
          user: {
            ...currentUser,
            balance: numericBalance,
            ownerId: currentUser?.ownerId
              ? {
                  ...currentUser.ownerId,
                  balance: numericBalance,
                }
              : currentUser?.ownerId,
          },
        };
      });

      useAuthStore.setState((state) => ({
        user: state.user
          ? {
              ...state.user,
              balance: numericBalance,
              ownerId: state.user.ownerId
                ? {
                    ...state.user.ownerId,
                    balance: numericBalance,
                  }
                : state.user.ownerId,
            }
          : state.user,
      }));
    };

    const applyBalanceDelta = (amount) => {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount)) {
        queryClient.invalidateQueries({ queryKey: ["ME"] });
        return;
      }

      const currentMeData = queryClient.getQueryData(["ME"]);
      const fallbackUser = currentMeData?.user || useAuthStore.getState().user;

      if (!fallbackUser) {
        queryClient.invalidateQueries({ queryKey: ["ME"] });
        return;
      }

      const currentBalance = Number(
        fallbackUser.balance || fallbackUser?.ownerId?.balance || 0,
      );
      updateCachedBalance(currentBalance + numericAmount);
    };

    const updateLatestHistoryBilling = (data) => {
      const incomingHistoryId = normalizeId(data?.historyId);

      queryClient.setQueryData(["latestHistory"], (oldData) => {
        const cachedHistoryId = normalizeId(oldData?._id);

        if (
          !oldData ||
          (incomingHistoryId && cachedHistoryId !== incomingHistoryId)
        ) {
          return oldData;
        }

        return {
          ...oldData,
          billedAmount: data?.billedAmount ?? oldData.billedAmount,
          lastKnownPrice: data?.price ?? oldData.lastKnownPrice,
          lastKnownEnergy: data?.energy ?? oldData.lastKnownEnergy,
          price: data?.isFinal ? (data?.price ?? oldData.price) : oldData.price,
          energy: data?.isFinal ? (data?.energy ?? oldData.energy) : oldData.energy,
          totalTime: data?.totalTime ?? oldData.totalTime,
          stopReason: data?.stopReason ?? oldData.stopReason,
        };
      });
    };

    const invalidateChargeState = () => {
      queryClient.invalidateQueries({ queryKey: ["ME"] });
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
      queryClient.invalidateQueries({ queryKey: ["NOTIFICATIONS"] });
      queryClient.invalidateQueries({ queryKey: ["E_CHARGE_DEVICE"] });
    };

    const updateCachedBikeChargingState = (isCharging) => {
      queryClient.setQueryData(["USERS_BIKE"], (oldData) => {
        if (!oldData?.bike) {
          return oldData;
        }

        return {
          ...oldData,
          bike: {
            ...oldData.bike,
            isCharging,
          },
        };
      });
    };

    const markChargeSessionStoppedLocally = () => {
      updateCachedBikeChargingState(false);
      queryClient.setQueryData(["latestHistory"], (oldData) => {
        if (!oldData || oldData.totalTime) {
          return oldData;
        }

        return {
          ...oldData,
          clientSessionStopped: true,
        };
      });
    };

    const getChargeEventKey = (data, fallback) => {
      const historyId = normalizeId(data?.historyId);
      const eventType = normalizeId(data?.type || fallback);
      if (historyId) {
        return [historyId, eventType].join(":");
      }

      return [
        fallback,
        eventType,
        normalizeId(data?.deviceCode ?? data?.deviceId ?? data?.device_id),
        normalizeId(data?.powerIndex ?? data?.powerId ?? data?.id),
        normalizeId(data?.stopReason),
      ].join(":");
    };

    const showHeadsUpNotification = ({ title, message, type, duration }) => {
      setToastTitle(title || "Thông báo");
      setToastMessage(message || "");
      setToastType(type || "success");
      setToastDuration(duration || 5000);
      setToastVisible(true);
    };

    const handleTransactionUpdate = (data) => {
      console.log("data", data);
      Alert.alert("Thông báo", data?.message || "Giao dịch đã được cập nhật.");

      const transaction = data?.transaction;
      const transactionStatus = transaction?.status || data?.status;

      if (transaction?._id && transactionStatus) {
        upsertTransactionHistory(transactionStatus, transaction);

        if (transactionStatus === "completed") {
          removeTransactionFromHistory("pending", transaction._id);
        }

        queryClient.invalidateQueries({ queryKey: ["TRANSACTION_HISTORY"] });
      }

      const amount = Number(transaction?.amount ?? data?.amount ?? 0);
      if (transactionStatus === "completed" && amount > 0) {
        // Cộng lạc quan để số dư nhảy ngay, không phải chờ round-trip HTTP.
        applyBalanceDelta(amount);
      }

      // Nạp lại VÔ ĐIỀU KIỆN khi giao dịch hoàn tất. Sự kiện đến từ namespace
      // gốc đã bị lược bớt payload nên không có amount — trước đây cả hai lệnh
      // invalidate đều nằm trong nhánh `amount > 0`, nên khi thiếu amount thì
      // số dư chỉ được cập nhật lúc app quay lại foreground (refetchOnWindowFocus).
      if (transactionStatus === "completed") {
        queryClient.invalidateQueries({ queryKey: ["ME"] });
        queryClient.invalidateQueries({ queryKey: ["TRANSACTION_HISTORY"] });
      }
    };

    const handleChargeBillingUpdate = (data) => {
      updateLatestHistoryBilling(data);

      if (data?.balance !== undefined && data?.balance !== null) {
        updateCachedBalance(data.balance);
      } else {
        queryClient.invalidateQueries({ queryKey: ["ME"] });
      }

      const isAutoStopping = data?.type === "auto_stopping";
      const isAutoStopped = data?.type === "auto_stopped";
      const isBalanceAutoStop =
        isAutoStopping ||
        isAutoStopped ||
        data?.stopReason === "insufficient_balance";

      if (isBalanceAutoStop) {
        if (isAutoStopped) {
          updateCachedBikeChargingState(false);
          invalidateChargeState();
        }

        const alertKey = getChargeEventKey(data, "server-stop");
        if (!serverStopAlertsRef.current.has(alertKey)) {
          serverStopAlertsRef.current.add(alertKey);
          const title = isAutoStopped ? "Phiên sạc đã dừng" : "Phiên sạc đang dừng";
          const message =
            data?.message ||
            "Số dư tài khoản sạc của bạn đã xuống dưới ngưỡng cho phép. Hệ thống đã tự động ngắt sạc.";
          showHeadsUpNotification({
            title,
            message,
            type: "warning",
            duration: 5000,
          });
          triggerUrgentAlert(title, message);
        }
        return;
      }

      if (data?.type === "charge_full") {
        updateCachedBikeChargingState(false);
        invalidateChargeState();

        if (
          wasChargeDeviceMissingRecently() ||
          wasChargeStoppedManuallyRecently()
        ) {
          return;
        }

        const alertKey = getChargeEventKey(data, "charge-full");
        if (!serverStopAlertsRef.current.has(alertKey)) {
          serverStopAlertsRef.current.add(alertKey);
          showHeadsUpNotification({
            title: "Xe đã sạc đầy",
            message:
              data?.message ||
              "Xe của bạn đã được sạc đầy. Hệ thống đã tự động ngắt sạc.",
            type: "success",
            duration: 5000,
          });
        }
        return;
      }

      if (data?.type === "charge_debit") {
        return;
      }

      if (data?.type === "low_balance") {
        const message =
          data?.message ||
          "Số dư tài khoản sạc của bạn sắp hết. Vui lòng nạp thêm.";
        Alert.alert("Thông báo", message);
        triggerUrgentAlert("Thông báo", message);
        invalidateChargeState();
      }
    };

    const handleChargeDeviceStatus = (data) => {
      const statusState = normalizeId(data?.state).toLowerCase();

      if (statusState !== "offline" && statusState !== "online") {
        return;
      }

      // Ổ sạc đổi trạng thái khả dụng (mất/có lại bản tin) -> refetch danh sách
      // ổ để mọi màn hình đang xem cập nhật realtime.
      queryClient.invalidateQueries({ queryKey: ["E_CHARGE_DEVICE"] });

      if (statusState === "online") {
        return;
      }

      // charge_device_status "offline" dùng chung cho nhiều tình huống ở
      // backend (xem charge.service.js): chỉ "no_signal" | "signal_lost"
      // (từ handleDeviceSignalLost, có huỷ phiên thật) mới đáng báo "không
      // có thiết bị". "no electric" (1 gói telemetry lẻ báo power=0 — kể cả
      // gói ĐẦU lúc vừa bật sạc, trước khi xe kéo dòng thật, hoàn toàn bình
      // thường) và "maintenance" (quét cả trụ offline) KHÔNG huỷ phiên ở
      // backend — báo nhầm sẽ đá văng phiên đang sạc thật ra ngoài ngay sau
      // khi vừa bật.
      const statusReason = normalizeId(data?.reason);
      if (statusReason !== "no_signal" && statusReason !== "signal_lost") {
        return;
      }

      const activeHistory = queryClient.getQueryData(["latestHistory"]);
      if (
        !activeHistory ||
        activeHistory?.totalTime ||
        activeHistory?.clientSessionStopped
      ) {
        return;
      }

      const activeDeviceCode = normalizeId(
        activeHistory?.deviceId?.deviceCode ??
          activeHistory?.deviceCode ??
          activeHistory?.deviceId,
      );
      const statusDeviceCode = normalizeId(
        data?.deviceCode ?? data?.deviceId ?? data?.device_id,
      );

      if (
        activeDeviceCode &&
        statusDeviceCode &&
        activeDeviceCode !== statusDeviceCode
      ) {
        return;
      }

      // Trụ nhiều ổ: khớp thêm powerIndex để không đá phiên đang sạc ở ổ A
      // khi ổ B (khác) trên cùng trụ mất tín hiệu.
      const activePowerIndex = normalizeId(
        activeHistory?.powerId?.index ?? activeHistory?.powerIndex,
      );
      const statusPowerIndex = normalizeId(data?.powerIndex);
      if (
        activePowerIndex &&
        statusPowerIndex &&
        activePowerIndex !== statusPowerIndex
      ) {
        return;
      }

      const alertKey = [
        "device-status",
        statusDeviceCode || activeDeviceCode,
        statusState,
        normalizeId(data?.reason),
      ].join(":");

      if (deviceStatusAlertsRef.current.has(alertKey)) {
        return;
      }

      deviceStatusAlertsRef.current.add(alertKey);
      markChargeSessionStoppedLocally();
      const message = "Không có thiết bị sử dụng. Vui lòng cắm thiết bị của bạn vào ổ sạc";
      Alert.alert("Thông báo", message);
      if (!wasChargeDeviceMissingRecently()) {
        triggerUrgentAlert("Thông báo", message);
      }
    };

    socket.on("transaction_update", handleTransactionUpdate);
    socket.on("charge_billing_update", handleChargeBillingUpdate);
    socket.on("charge_device_status", handleChargeDeviceStatus);

    return () => {
      socket.off("transaction_update", handleTransactionUpdate);
      socket.off("charge_billing_update", handleChargeBillingUpdate);
      socket.off("charge_device_status", handleChargeDeviceStatus);
    };
  }, [queryClient]);

  // Hiển thị loading khi đang check token
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: styles.container,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={AppNavigator} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
      <ToastNotification
        visible={toastVisible}
        title={toastTitle}
        message={toastMessage}
        type={toastType}
        duration={toastDuration}
        onDismiss={() => setToastVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
    backgroundColor: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
});

export default RootNavigator;
