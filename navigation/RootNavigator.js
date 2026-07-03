import { useEffect, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet, Alert } from "react-native";
import { useAuthStore } from "../stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";

import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import FeedbackScreen from "../screens/FeedbackScreen";
import { socket } from "../services/socket.service";
import { useHistory } from "../queries/history.query";
import { Colors } from "../constants/color";
import ToastNotification from "../components/ToastNotification";

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
  const [toastDuration, setToastDuration] = useState(4000);

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
        if (latestHistory?._id && !latestHistory?.totalTime) {
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
      if (latestHistory?._id && !latestHistory?.totalTime) {
        socket.emit(
          "telemetry_data",
          `user_${userId}_${latestHistory.deviceId?.deviceCode}_${latestHistory.powerId?.index}`,
        );
      }
      socket.emit("transaction_update", userId);
    };

    // Join ngay + join lại mỗi lần reconnect
    joinRooms();
    socket.on("connect", joinRooms);

    return () => {
      socket.off("connect", joinRooms);
    };
  }, [isAuthenticated, userId, latestHistory]);

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
      setToastDuration(duration || 4000);
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
        applyBalanceDelta(amount);
        queryClient.invalidateQueries({ queryKey: ["ME"] });
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
          showHeadsUpNotification({
            title:
              isAutoStopped
                ? "Phiên sạc đã dừng"
                : "Phiên sạc đang dừng",
            message:
              data?.message ||
              "Số dư tài khoản sạc của bạn đã xuống dưới ngưỡng cho phép. Hệ thống đã tự động ngắt sạc.",
            type: "warning",
            duration: 12000,
          });
        }
        return;
      }

      if (data?.type === "charge_debit") {
        return;
      }

      if (data?.type === "low_balance") {
        Alert.alert(
          "Thông báo",
          data?.message ||
            "Số dư tài khoản sạc của bạn sắp hết. Vui lòng nạp thêm.",
        );
        invalidateChargeState();
      }
    };

    const handleChargeDeviceStatus = (data) => {
      const statusState = normalizeId(data?.state).toLowerCase();

      if (statusState !== "offline") {
        return;
      }

      const activeHistory = queryClient.getQueryData(["latestHistory"]);
      if (!activeHistory || activeHistory?.totalTime) {
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
      queryClient.invalidateQueries({ queryKey: ["E_CHARGE_DEVICE"] });
      Alert.alert(
        "Thông báo",
        "Trụ sạc đang mất tín hiệu. Phiên sạc sẽ được cập nhật khi hệ thống nhận lại dữ liệu từ thiết bị.",
      );
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
