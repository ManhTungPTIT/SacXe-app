import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useChargeQuery } from "../../queries/charge.query";
import DevicesComponents from "../charging/DevicesComponents";

const InitiateChargeComponent = ({
  devices,
  setDevices,
  deviceCode,
  setdeviceCode,
  setIsScanned,
  setPowerId,
  deviceId,
  onChargeStarted,
}) => {
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const initiateChargeMutation = useChargeQuery.useInitiate();

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        alert("Cần quyền truy cập camera để quét mã QR");
        return;
      }
    }
    scannedRef.current = false;
    setScanning(true);
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanning(false);

    setdeviceCode(data);
    setIsScanned(true);
  };

  return devices?.powerOutlets?.length > 0 ? (
    <DevicesComponents
      devices={devices.powerOutlets}
      setDevices={setDevices}
      deviceCode={deviceCode}
      setdeviceCode={setdeviceCode}
      setPowerId={setPowerId}
      deviceId={deviceId}
      onChargeStarted={onChargeStarted}
    />
  ) : (
    <View style={styles.container}>
      <Modal visible={scanning} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.cameraView}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <TouchableOpacity
            style={styles.closeScannerButton}
            onPress={() => setScanning(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.scannerHintContainer}>
            <Text style={styles.scannerHintText}>
              Hướng camera vào mã QR để quét
            </Text>
          </View>
        </View>
      </Modal>

      <View style={styles.contentContainer}>
        <View style={styles.iconWrap}>
          <MaterialIcons
            name="electrical-services"
            size={24}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.title}>Bắt đầu phiên sạc</Text>
        <Text style={styles.description}>
          Vui lòng quét mã QR để bắt đầu phiên sạc
        </Text>
        <View>
          <TouchableOpacity
            style={styles.scanButton}
            disabled={initiateChargeMutation.isPending}
            onPress={handleOpenScanner}
          >
            <Text style={styles.scanButtonText}>
              {initiateChargeMutation.isPending
                ? "Đang xử lý..."
                : "Quét mã QR để sạc"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.warningBox}>
        <AntDesign name="warning" size={18} color={Colors.warning} />
        <Text style={styles.warningText}>
          Lưu ý: Bạn có 5 phút để kích hoạt phiên sạc sau khi đưa xe vào khu
          vực. Quá thời gian quy định sẽ bị phạt!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginVertical: 24,
    gap: 16,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraView: {
    flex: 1,
  },
  closeScannerButton: {
    position: "absolute",
    top: 48,
    left: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 8,
  },
  scannerHintContainer: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  scannerHintText: {
    color: "#fff",
    fontSize: 16,
  },
  contentContainer: {
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  iconWrap: {
    padding: 32,
    backgroundColor: "#f1eeee",
    borderRadius: 16,
  },
  title: {
    marginTop: 8,
    fontWeight: "bold",
    fontSize: 16,
  },
  description: {
    marginTop: 4,
    color: "#666",
    textAlign: "center",
  },
  scanButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 8,
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  warningBox: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  warningText: {
    color: "#666",
    textAlign: "center",
    flexShrink: 1,
  },
});

export default InitiateChargeComponent;
