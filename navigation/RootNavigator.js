import { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuthStore } from "../stores/auth.store";
import { useQueryClient } from "@tanstack/react-query";

import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
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
    const handleTransactionUpdate = (data) => {
      alert(data.message);

      if (data.status === "completed" && data.amount) {
        queryClient.setQueryData(["ME"], (oldData) => {
          if (!oldData || !oldData.user || !oldData.user.ownerId)
            return oldData;
          return {
            ...oldData,
            user: {
              ...oldData.user,
              ownerId: {
                ...oldData.user.ownerId,
                balance: (oldData.user.ownerId.balance || 0) + data.amount,
              },
            },
          };
        });
      }
    };

    socket.on("transaction_update", handleTransactionUpdate);

    return () => {
      socket.off("transaction_update", handleTransactionUpdate);
    };
  }, [socket, queryClient]);

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
        <Stack.Screen name="Main" component={AppNavigator} />
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
