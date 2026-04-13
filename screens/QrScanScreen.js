import React, { useCallback, useRef } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/color";

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

  const ensureCameraPermission = useCallback(async () => {
    if (permission?.granted) {
      return true;
    }

    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        "Can quyen camera",
        "Ban can cap quyen camera de quet ma QR bat dau sac.",
      );
      return false;
    }

    return true;
  }, [permission?.granted, requestPermission]);

  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;
      ensureCameraPermission();

      return () => {
        scannedRef.current = false;
      };
    }, [ensureCameraPermission]),
  );

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      if (scannedRef.current) {
        return;
      }

      const scannedDeviceCode = normalizeScannedCode(data);
      if (!scannedDeviceCode) {
        Alert.alert("Ma QR khong hop le", "Vui long thu quet lai ma QR.");
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
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera" size={44} color={Colors.primary} />
        <Text style={styles.permissionTitle}>Can cap quyen camera</Text>
        <Text style={styles.permissionDescription}>
          Cho phep truy cap camera de quet ma QR va bat dau phien sac.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={ensureCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Cap quyen camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
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
  );
};

const styles = StyleSheet.create({
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
});

export default QrScanScreen;
