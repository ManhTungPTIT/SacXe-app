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
import InitiateChargeComponent from "../components/bike/InitiateChargeComponent";
import ChargingStatusComponent from "../components/charging/ChargingStatusComponent";
import { useChargeQuery } from "../queries/charge.query";
import { useEChargeDeviceQuery } from "../queries/eChargeDevice.query";
import { Colors } from "../constants/color";
import { SafeAreaView } from "react-native-safe-area-context";

const ChargeScreen = ({ route, navigation }) => {
  const [devices, setDevices] = useState([]);
  const [isScanned, setIsScanned] = useState(false);
  const [deviceCode, setdeviceCode] = useState(null);
  const [powerId, setPowerId] = useState(null);
  const [deviceId, setDeviceId] = useState(null);

  const {
    data: bike,
    isLoading: isLoadingBikeData,
    isError,
  } = useBike.useGetMyBike();
  const terminateChargeMutation = useChargeQuery.useTerminate();
  const {
    data: eChargeDevices,
    isLoading: isDeviceLoading,
    isError: isDeviceError,
  } = useEChargeDeviceQuery.useGetDevices({
    deviceCode,
  });

  useEffect(() => {
    if (eChargeDevices) {
      setDeviceId(eChargeDevices?.eChargeDevices?._id);
    }
  }, [eChargeDevices]);

  useEffect(() => {
    const scannedDeviceCode = route?.params?.scannedDeviceCode;
    const scanToken = route?.params?.scanToken;

    if (!scanToken || !scannedDeviceCode) {
      return;
    }

    setDevices([]);
    setPowerId(null);
    setDeviceId(null);
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
          setDeviceId(null);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            {bike?.bike ? (
              <>
                <View style={styles.headerSection}>
                  <Text style={styles.screenTitle}>Phiên sạc của bạn</Text>
                </View>

                {bike?.bike?.isCharging ? (
                  <>
                    <ChargingStatusComponent
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
              </>
            ) : (
              <BikeRegistration />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: Colors.primary,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.secondary,
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
    paddingHorizontal: 16,
  },
});

export default ChargeScreen;
