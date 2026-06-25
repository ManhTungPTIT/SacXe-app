import { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet, Alert } from "react-native";
import { useAuthStore } from "../stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";

import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import FeedbackScreen from "../screens/FeedbackScreen";
import { socket } from "../services/socket.service";
import { useHistory } from "../queries/history.query";

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialize = useAuthStore((state) => state.initialize);
  const userId = useAuthStore((state) => state.user?._id);
  const { data: latestHistory } = useHistory.useGetLatestHistory();

  // Khởi tạo auth state khi mở app
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      socket.connect();
      // join vào room của user để nhận thông báo
      if (userId) {
        if (latestHistory?._id && !latestHistory?.price) {
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
      if (latestHistory?._id && !latestHistory?.price) {
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
        const currentMeData = queryClient.getQueryData(["ME"]);
        const fallbackUser =
          currentMeData?.user || useAuthStore.getState().user;

        if (!fallbackUser) {
          queryClient.invalidateQueries({ queryKey: ["ME"] });
          return;
        }

        const currentBalance = Number(
          fallbackUser.balance || fallbackUser?.ownerId?.balance || 0,
        );
        const nextBalance = currentBalance + amount;

        queryClient.setQueryData(["ME"], (oldData) => {
          const currentUser = oldData?.user || fallbackUser;

          return {
            ...(oldData || {}),
            user: {
              ...currentUser,
              balance: nextBalance,
              ownerId: currentUser?.ownerId
                ? {
                    ...currentUser.ownerId,
                    balance: nextBalance,
                  }
                : currentUser?.ownerId,
            },
          };
        });

        useAuthStore.setState((state) => ({
          user: state.user
            ? {
                ...state.user,
                balance: nextBalance,
                ownerId: state.user.ownerId
                  ? {
                      ...state.user.ownerId,
                      balance: nextBalance,
                    }
                  : state.user.ownerId,
              }
            : state.user,
        }));

        queryClient.invalidateQueries({ queryKey: ["ME"] });
      }
    };

    socket.on("transaction_update", handleTransactionUpdate);

    return () => {
      socket.off("transaction_update", handleTransactionUpdate);
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
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});

export default RootNavigator;
