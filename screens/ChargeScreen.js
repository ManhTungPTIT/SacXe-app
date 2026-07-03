import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import BikeRegistration from "../components/bike/BikeRegistration";
import { useBike } from "../queries/bike.query";
import ToastNotification from "../components/ToastNotification";
import InitiateChargeComponent from "../components/bike/InitiateChargeComponent";
import ChargingStatusComponent from "../components/charging/ChargingStatusComponent";
import { useChargeQuery } from "../queries/charge.query";
import { useEChargeDeviceQuery } from "../queries/eChargeDevice.query";
import { useHistory } from "../queries/history.query";
import { Colors } from "../constants/color";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

const ChargeScreen = ({ route, navigation }) => {
  const queryClient = useQueryClient();
  const [devices, setDevices] = useState([]);
  const [isScanned, setIsScanned] = useState(() => {
    return !!queryClient.getQueryData(["SCANNED_DEVICE_CODE"]);
  });
  const [deviceCode, setdeviceCode] = useState(() => {
    return queryClient.getQueryData(["SCANNED_DEVICE_CODE"]) || null;
  });
  const [powerId, setPowerId] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const {
    data: bike,
    isLoading: isLoadingBikeData,
    isError,
  } = useBike.useGetMyBike();
  const { data: latestHistory } = useHistory.useGetLatestHistory();
  const terminateChargeMutation = useChargeQuery.useTerminate();
  const {
    data: eChargeDevices,
    isLoading: isDeviceLoading,
    isError: isDeviceError,
  } = useEChargeDeviceQuery.useGetDevices({
    deviceCode,
  });

  const deviceId = eChargeDevices?.eChargeDevices?._id || null;
  const chargingStartTime = latestHistory?.startTime || latestHistory?.createdAt;
  const initialEnergyKwh =
    Number(latestHistory?.lastKnownEnergy ?? latestHistory?.energy ?? 0) || 0;

  useEffect(() => {
    queryClient.setQueryData(["SCANNED_DEVICE_CODE"], deviceCode);
  }, [deviceCode, queryClient]);

  useEffect(() => {
    const scannedDeviceCode = route?.params?.scannedDeviceCode;
    const scanToken = route?.params?.scanToken;

    if (!scanToken || !scannedDeviceCode) {
      return;
    }

    setDevices([]);
    setPowerId(null);
    setdeviceCode(String(scannedDeviceCode));
    setIsScanned(true);

    // Show heads-up notification for successful QR scan
    setToastMessage("Quét mã QR tại trụ sạc thành công!");
    setToastVisible(true);

    navigation.setParams({
      scannedDeviceCode: undefined,
      scanToken: undefined,
    });
  }, [route?.params?.scanToken, route?.params?.scannedDeviceCode, navigation]);



  useEffect(() => {
    if (isScanned && deviceCode && !isDeviceLoading) {
      if (!eChargeDevices || isDeviceError) {
        Alert.alert("Thông báo", "Mã QR không hợp lệ. Vui lòng thử lại.");
        setIsScanned(false);
        setdeviceCode(null);
      }
    }
  }, [isScanned, deviceCode, eChargeDevices, isDeviceLoading, isDeviceError]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      if (route?.params?.isUpdating) {
        navigation.setParams({ isUpdating: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route?.params?.isUpdating]);

  if (isLoadingBikeData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  const isStopping = terminateChargeMutation.isLoading || terminateChargeMutation.isPending;

  const executeStopCharging = () => {
    terminateChargeMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          const activeDeviceCode = deviceCode || latestHistory?.deviceId?.deviceCode;
          queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
          queryClient.invalidateQueries({ queryKey: ["latestHistory"] });

          setToastMessage("Dừng sạc xe thành công!");
          setToastVisible(true);

          if (activeDeviceCode) {
            queryClient.invalidateQueries({ queryKey: ["E_CHARGE_DEVICE", String(activeDeviceCode)] });
            setdeviceCode(String(activeDeviceCode));
            setIsScanned(true);
            setPowerId(null);
          } else {
            setDevices([]);
            setIsScanned(false);
            setdeviceCode(null);
            setPowerId(null);
          }
        },
      },
    );
  };

  const handleStopCharging = () => {
    if (isStopping) return;
    Alert.alert(
      "Thông báo",
      "Bạn có chắc chắn muốn dừng sạc không?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xác nhận",
          onPress: executeStopCharging,
        },
      ],
      { cancelable: true },
    );
  };

  const isUpdating = route?.params?.isUpdating;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {bike?.bike && !isUpdating ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.page}>
              <View style={styles.headerSection}>
                <Text style={styles.screenTitle}>Phiên sạc của bạn</Text>
              </View>

              {bike?.bike?.isCharging ? (
                <>
                  <ChargingStatusComponent
                    chargingStartTime={chargingStartTime}
                    initialEnergyKwh={initialEnergyKwh}
                    onStopCharging={handleStopCharging}
                    isStopping={isStopping}
                  />
                </>
              ) : (
                <InitiateChargeComponent
                  navigation={navigation}
                  devices={eChargeDevices}
                  setDevices={setDevices}
                  isScanned={isScanned}
                  setIsScanned={setIsScanned}
                  deviceCode={deviceCode}
                  setdeviceCode={setdeviceCode}
                  setPowerId={setPowerId}
                  deviceId={deviceId}
                  onScanQrPress={() => navigation.navigate("ScanQR")}
                  onChargeStarted={() => {
                    setToastMessage("Bắt đầu sạc xe thành công!");
                    setToastVisible(true);
                    navigation.navigate("Charge");
                  }}
                />
              )}
            </View>
          </ScrollView>
        ) : (
          <BikeRegistration
            isUpdating={isUpdating}
            onCancel={() => navigation.setParams({ isUpdating: false })}
            onSuccess={() => {
              setToastMessage(isUpdating ? "Cập nhật giấy tờ xe thành công!" : "Đăng ký xe thành công!");
              setToastVisible(true);
              if (isUpdating) {
                navigation.setParams({ isUpdating: false });
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "500",
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  page: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.secondary,
  },
  headerSection: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginHorizontal: -24,
  },
});

export default ChargeScreen;
