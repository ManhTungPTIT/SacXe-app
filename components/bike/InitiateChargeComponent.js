import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/color";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AntDesign from "@expo/vector-icons/AntDesign";
import DevicesComponents from "../charging/DevicesComponents";
import { useEChargeDeviceQuery } from "../../queries/eChargeDevice.query";

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
  const { data: myDevicesData, isLoading: isLoadingMyDevices } =
    useEChargeDeviceQuery.useGetMyDevices();
  const unclaimDeviceMutation = useEChargeDeviceQuery.useUnclaimDevice();

  const myDevices = myDevicesData?.devices || [];

  const handleSelectMyDevice = (device) => {
    setDevices([]);
    setPowerId(null);
    setdeviceCode(String(device.deviceCode));
    setIsScanned(true);
  };

  const handleRemoveMyDevice = (device) => {
    Alert.alert(
      "Thông báo",
      `Bạn có chắc muốn bỏ thiết bị ${device.deviceCode} khỏi tài khoản?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Bỏ thiết bị",
          style: "destructive",
          onPress: () =>
            unclaimDeviceMutation.mutate({ deviceCode: device.deviceCode }),
        },
      ],
    );
  };

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
      <View style={styles.myDeviceSection}>
        <View style={styles.myDeviceHeader}>
          <Text style={styles.myDeviceSectionTitle}>Thiết bị của bạn</Text>
          <TouchableOpacity
            style={styles.addDeviceButton}
            onPress={() => navigation.navigate("ScanQR", { mode: "claim" })}
            activeOpacity={0.8}
          >
            <AntDesign name="plus" size={16} color={Colors.primary} />
            <Text style={styles.addDeviceButtonText}>Thêm</Text>
          </TouchableOpacity>
        </View>

        {isLoadingMyDevices ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
        ) : myDevices.length === 0 ? (
          <Text style={styles.myDeviceEmptyText}>
            Bạn chưa có thiết bị nào. Quét mã QR trên thiết bị tại nhà để thêm
            vào tài khoản.
          </Text>
        ) : (
          myDevices.map((device) => (
            <TouchableOpacity
              key={device._id}
              style={styles.myDeviceItem}
              onPress={() => handleSelectMyDevice(device)}
              activeOpacity={0.8}
            >
              <View style={styles.myDeviceIconWrap}>
                <MaterialIcons
                  name="electrical-services"
                  size={22}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.myDeviceInfo}>
                <Text style={styles.myDeviceCode}>{device.deviceCode}</Text>
                {device.address ? (
                  <Text style={styles.myDeviceAddress} numberOfLines={1}>
                    {device.address}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveMyDevice(device)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AntDesign
                  name="delete"
                  size={18}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
      {/* <View style={styles.warningBox}>
        <AntDesign name="warning" size={20} color={Colors.warning} />
        <Text style={styles.warningText}>
          Lưu ý: Bạn có 5 phút để kích hoạt phiên sạc sau khi đưa xe vào khu
          vực. Quá thời gian quy định sẽ bị phạt!
        </Text>
      </View> */}
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
  myDeviceSection: {
    width: "100%",
    gap: 12,
  },
  myDeviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  myDeviceSectionTitle: {
    color: Colors.textPrimaryDark,
    fontSize: 16,
    fontWeight: "800",
  },
  addDeviceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addDeviceButtonText: {
    color: Colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  myDeviceEmptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  myDeviceItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.bgGreenTint,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  myDeviceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  myDeviceInfo: {
    flex: 1,
  },
  myDeviceCode: {
    color: Colors.textPrimaryDark,
    fontSize: 16,
    fontWeight: "800",
  },
  myDeviceAddress: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});

export default InitiateChargeComponent;
