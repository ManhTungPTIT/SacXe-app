import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/color";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AntDesign from "@expo/vector-icons/AntDesign";
import DevicesComponents from "../charging/DevicesComponents";

const InitiateChargeComponent = ({
  navigation,
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
      navigation={navigation}
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
            size={28}
            color={Colors.primary}
          />
        </View>
        <Text style={styles.title}>Bắt đầu phiên sạc</Text>
        <Text style={styles.description}>
          Vui lòng quét mã QR gắn trên trụ sạc để kích hoạt phiên sạc cho xe của bạn.
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={onScanQrPress}
            activeOpacity={0.8}
          >
            <Text style={styles.scanButtonText}>Quét mã QR ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.warningBox}>
        <AntDesign name="warning" size={20} color={Colors.warning} />
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
    marginVertical: 32,
    gap: 24,
  },
  contentContainer: {
    display: "flex",
    alignItems: "flex-start",
    width: "100%",
  },
  iconWrap: {
    padding: 16,
    backgroundColor: Colors.cardBgLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  title: {
    fontWeight: "800",
    fontSize: 28,
    color: Colors.textDark,
    lineHeight: 34,
    marginBottom: 12,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "left",
    marginBottom: 32,
  },
  buttonContainer: {
    width: "100%",
  },
  scanButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  scanButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    width: "100%",
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.cardBgLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningText: {
    color: Colors.textSecondary,
    textAlign: "left",
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default InitiateChargeComponent;
