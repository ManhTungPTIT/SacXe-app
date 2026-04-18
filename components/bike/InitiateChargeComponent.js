import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/color";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AntDesign from "@expo/vector-icons/AntDesign";
import DevicesComponents from "../charging/DevicesComponents";

const InitiateChargeComponent = ({
  devices,
  setDevices,
  deviceCode,
  setdeviceCode,
  setIsScanned,
  setPowerId,
  deviceId,
  onScanQrPress,
  onChargeStarted,
}) => {
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
          <TouchableOpacity style={styles.scanButton} onPress={onScanQrPress}>
            <Text style={styles.scanButtonText}>Quét mã QR để sạc</Text>
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
