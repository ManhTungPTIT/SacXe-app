import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
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

const ChargeScreen = ({ route, navigation }) => {
  const [devices, setDevices] = useState([]);
  const [isScanned, setIsScanned] = useState(false);
  const [deviceCode, setdeviceCode] = useState(null);
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
      <View style={styles.container}>
        <Text>Đang tải thông tin xe...</Text>
      </View>
    );
  }

  const executeStopCharging = () => {
    terminateChargeMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          setDevices([]);
          setIsScanned(false);
          setdeviceCode(null);
          setPowerId(null);
        },
      },
    );
  };

  const handleStopCharging = () => {
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
    <SafeAreaView style={styles.safeArea}>
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
                    onStopCharging={handleStopCharging}
                  />
                </>
              ) : (
                <InitiateChargeComponent
                  devices={eChargeDevices}
                  setDevices={setDevices}
                  isScanned={isScanned}
                  setIsScanned={setIsScanned}
                  deviceCode={deviceCode}
                  setdeviceCode={setdeviceCode}
                  setPowerId={setPowerId}
                  deviceId={deviceId}
                  onScanQrPress={() => navigation.navigate("ScanQR")}
                  onChargeStarted={() => navigation.navigate("Charge")}
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
    backgroundColor: Colors.secondary,
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
