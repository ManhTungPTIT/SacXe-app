import React, { useCallback, useRef } from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/color";
import { SafeAreaView } from "react-native-safe-area-context";

const normalizeScannedCode = (rawData) => {
  const value = rawData?.trim();

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === "string") {
      return parsed.trim();
    }

    const fromObject =
      parsed?.deviceCode || parsed?.device_code || parsed?.code;

    if (fromObject) {
      return String(fromObject).trim();
    }
  } catch (error) {
    // Ignore parse errors and fallback to regex/plain text.
  }

  const queryMatch = value.match(
    /[?&](?:deviceCode|device_code|code)=([^&#]+)/i,
  );
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]).trim();
  }

  return value;
};

const QrScanScreen = ({ navigation }) => {
  const scannedRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  const openCameraSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert(
        "Thông báo",
        "Vui lòng vào phần Cài đặt của thiết bị để bật quyền camera cho ứng dụng.",
      );
    }
  }, []);

  const ensureCameraPermission = useCallback(
    async (options = {}) => {
      const { showBlockedAlert = true } = options;

      if (permission?.granted) {
        return true;
      }

      if (permission && permission.canAskAgain === false) {
        if (showBlockedAlert) {
          Alert.alert(
            "Thông báo",
            "Bạn đã từ chối quyền camera. Vui lòng mở Cài đặt để bật lại quyền này.",
            [
              {
                text: "Mở cài đặt",
                onPress: openCameraSettings,
              },
              {
                text: "Để sau",
                style: "cancel",
              },
            ],
          );
        }
        return false;
      }

      const result = await requestPermission();
      if (!result.granted) {
        if (result.canAskAgain === false) {
          if (showBlockedAlert) {
            Alert.alert(
              "Thông báo",
              "Bạn đã từ chối quyền camera. Vui lòng mở Cài đặt để bật lại quyền này.",
              [
                {
                  text: "Mở cài đặt",
                  onPress: openCameraSettings,
                },
                {
                  text: "Để sau",
                  style: "cancel",
                },
              ],
            );
          }
        } else {
          Alert.alert("Thông báo", "Bạn cần cấp quyền camera để quét mã QR.");
        }
        return false;
      }

      return true;
    },
    [openCameraSettings, permission, requestPermission],
  );

  const handlePermissionAction = useCallback(() => {
    if (permission && permission.canAskAgain === false) {
      openCameraSettings();
      return;
    }

    ensureCameraPermission();
  }, [ensureCameraPermission, openCameraSettings, permission]);

  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;

      if (!permission?.granted) {
        ensureCameraPermission({ showBlockedAlert: false });
      }

      return () => {
        scannedRef.current = false;
      };
    }, [ensureCameraPermission, permission?.granted]),
  );

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      if (scannedRef.current) {
        return;
      }

      const scannedDeviceCode = normalizeScannedCode(data);
      if (!scannedDeviceCode) {
        Alert.alert(
          "Thông báo",
          "Mã QR không hợp lệ. Vui lòng thử quét lại mã QR.",
        );
        return;
      }

      scannedRef.current = true;
      navigation.navigate("Charge", {
        scannedDeviceCode,
        scanToken: Date.now(),
      });
    },
    [navigation],
  );

  if (!permission?.granted) {
    const isPermissionBlocked = permission && permission.canAskAgain === false;

    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera" size={44} color={Colors.primary} />
        <Text style={styles.permissionTitle}>
          {isPermissionBlocked ? "Quyền camera đang tắt" : "Cần quyền camera"}
        </Text>
        <Text style={styles.permissionDescription}>
          {isPermissionBlocked
            ? "Ứng dụng không thể mở camera vì quyền đã bị tắt. Hãy mở Cài đặt để cấp lại quyền camera."
            : "Cho phép truy cập camera để quét mã QR."}
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={handlePermissionAction}
        >
          <Text style={styles.permissionButtonText}>
            {isPermissionBlocked ? "Mở cài đặt" : "Cấp quyền camera"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />

        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.scanFrame} />
          <Text style={styles.guideText}>Đưa mã QR vào khung để quét</Text>
        </View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Charge")}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          <Text style={styles.backText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  guideText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  permissionTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "700",
    color: "#1E1E1E",
  },
  permissionDescription: {
    marginTop: 10,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  permissionSecondaryButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionSecondaryButtonText: {
    color: Colors.primary,
    fontWeight: "600",
  },
});

export default QrScanScreen;
