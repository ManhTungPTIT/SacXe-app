import { useEffect } from "react";
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
import Ionicons from "@expo/vector-icons/Ionicons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DevicesComponents from "../charging/DevicesComponents";
import { useEChargeDeviceQuery } from "../../queries/eChargeDevice.query";
import deviceDisplayName from "../../utils/deviceDisplayName";

const { getDeviceDisplayName, hasCustomDeviceName } = deviceDisplayName;

// Màn bắt đầu sạc gồm 3 bước:
// 1. Chọn loại trụ: công cộng (quét QR) / tại gia (trụ của tôi)
// 2. Luồng theo loại đã chọn
// 3. Chọn ổ sạc (DevicesComponents) — chung cho cả hai luồng
const InitiateChargeComponent = ({
  navigation,
  devices,
  setDevices,
  deviceCode,
  setdeviceCode,
  setIsScanned,
  setPowerId,
  deviceId,
  mode,
  setMode,
  openHomeDevicesToken,
  activeSessionsData,
  onScanQrPress,
  onChargeStarted,
  onOpenActiveSession,
  onRequireDeviceSetup,
  // Thanh 3 bước của luồng công cộng, dựng sẵn ở ChargeScreen (null khi không
  // phải người dùng lần đầu, hoặc khi đang ở luồng trụ gia đình). Nhận nguyên
  // khối thay vì cờ + số bước: component này là MỘT trong ba màn của luồng đó,
  // nó không cần biết luồng có mấy bước.
  stepper = null,
}) => {

  const { data: myDevicesData, isLoading: isLoadingMyDevices } =
    useEChargeDeviceQuery.useGetMyDevices();
  const unclaimDeviceMutation = useEChargeDeviceQuery.useUnclaimDevice();

  // Chuẩn hóa response về mảng trước khi dùng length/map.
  const myDeviceCandidates = [
    myDevicesData,
    myDevicesData?.devices,
    myDevicesData?.devices?.devices,
    myDevicesData?.eChargeDevices,
    myDevicesData?.data,
    myDevicesData?.data?.devices,
    myDevicesData?.data?.eChargeDevices,
    myDevicesData?.devices?.data,
    myDevicesData?.devices?.docs,
    myDevicesData?.items,
  ];
  const myDeviceArray = myDeviceCandidates.find(Array.isArray);
  const singleMyDevice = myDeviceCandidates.find(
    (candidate) => candidate?.deviceCode,
  );
  const myDevices =
    myDeviceArray || (singleMyDevice ? [singleMyDevice] : []);

  useEffect(() => {
    if (!openHomeDevicesToken) return;

    setMode("home");
    navigation.setParams({ openHomeDevicesToken: undefined });
  }, [navigation, openHomeDevicesToken]);

  const handleSelectMyDevice = (device) => {
    // Địa chỉ là bắt buộc với trụ nhà dân. Trụ thêm từ trước bước thiết lập này
    // (hoặc bị thoát giữa chừng) vẫn có thể trống — chặn ở đây thì không còn
    // đường nào dùng một trụ chưa có địa chỉ.
    if (!String(device?.address || "").trim()) {
      onRequireDeviceSetup?.(String(device.deviceCode));
      return;
    }

    setDevices([]);
    setPowerId(null);
    setdeviceCode(String(device.deviceCode));
    setIsScanned(true);
  };

  const handleRemoveMyDevice = (device) => {
    Alert.alert(
      "Thông báo",
      `Bạn có chắc muốn bỏ thiết bị ${getDeviceDisplayName(device)} khỏi tài khoản?`,
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

  const selectedDevice =
    devices?.eChargeDevices || devices?.device || devices?.data || devices;
  const powerOutlets = selectedDevice?.powerOutlets || devices?.powerOutlets || [];

  // Bước 3: đã có thiết bị (quét QR hoặc chọn trụ nhà) -> chọn ổ sạc
  if (powerOutlets.length > 0) {
    return (
      <DevicesComponents
        stepper={stepper}
        navigation={navigation}
        devices={powerOutlets}
        setDevices={setDevices}
        deviceCode={deviceCode}
        setdeviceCode={setdeviceCode}
        setPowerId={setPowerId}
        deviceId={deviceId}
        deviceAddress={selectedDevice?.address || devices?.address}
        deviceIsHouse={selectedDevice?.isHouse ?? devices?.isHouse}
        deviceName={selectedDevice?.name || devices?.name}
        activeSessionsData={activeSessionsData}
        onChargeStarted={onChargeStarted}
        onOpenActiveSession={onOpenActiveSession}
      />
    );
  }

  // Bước 1: màn chọn loại trụ sạc
  if (mode === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.chooserTitle}>Bạn muốn sạc ở đâu?</Text>
        <Text style={styles.chooserSubtitle}>
          Chọn loại trụ sạc để bắt đầu phiên sạc cho xe của bạn.
        </Text>

        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => setMode("public")}
          activeOpacity={0.85}
        >
          <View style={styles.modeIconWrap}>
            <MaterialIcons name="ev-station" size={30} color={Colors.primary} />
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>Sạc trụ sạc công cộng</Text>
            <Text style={styles.modeDescription}>
              Quét mã QR tại trụ sạc ở chung cư, bãi xe...
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modeCard}
          onPress={() => setMode("home")}
          activeOpacity={0.85}
        >
          <View style={styles.modeIconWrap}>
            <MaterialCommunityIcons
              name="home-lightning-bolt-outline"
              size={30}
              color={Colors.primary}
            />
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeTitle}>Sạc trụ sạc gia đình</Text>
            <Text style={styles.modeDescription}>
              Dùng thiết bị sạc của riêng bạn tại nhà.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  // Nút quay lại màn chọn loại trụ (dùng chung cho bước 2)
  const backButton = (
    <TouchableOpacity
      style={styles.backRow}
      onPress={() => setMode(null)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="arrow-back" size={18} color={Colors.primary} />
      <Text style={styles.backText}>Chọn loại trụ khác</Text>
    </TouchableOpacity>
  );

  // Bước 2a: luồng trụ công cộng — quét QR
  if (mode === "public") {
    return (
      <View style={styles.container}>
        {backButton}
        {stepper}
        <Text style={styles.flowTitle}>Sạc trụ công cộng</Text>
        <Text style={styles.flowDescription}>
          Vui lòng quét mã QR gắn trên trụ sạc để kích hoạt phiên sạc cho xe của
          bạn.
        </Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => onScanQrPress({ mode: "charge" })}
          activeOpacity={0.8}
        >
          <View style={styles.scanButtonIcon}>
            <Ionicons name="qr-code" size={22} color={Colors.primary} />
          </View>
          <Text style={styles.scanButtonText}>Quét QR để bắt đầu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Bước 2b: luồng trụ tại gia — danh sách trụ của tôi
  return (
    <View style={styles.container}>
      {backButton}
      <View style={styles.myDeviceSection}>
        <View style={styles.myDeviceHeader}>
          <Text style={styles.myDeviceSectionTitle}>Trụ sạc gia đình</Text>
          {myDevices.length > 0 ? (
            <TouchableOpacity
              style={styles.addDeviceButton}
              onPress={() => onScanQrPress({ mode: "claim" })}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.addDeviceButtonText}>Thêm thiết bị</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isLoadingMyDevices ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
        ) : myDevices.length === 0 ? (
          <>
            <Text style={styles.myDeviceEmptyText}>
              Bạn chưa có trụ sạc nào. Quét mã QR trên thiết bị tại nhà để thêm
              vào tài khoản.
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => onScanQrPress({ mode: "claim" })}
              activeOpacity={0.8}
            >
              <View style={styles.scanButtonIcon}>
                <Ionicons name="qr-code" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.scanButtonText}>Quét QR thiết bị</Text>
            </TouchableOpacity>
          </>
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
                <Text style={styles.myDeviceCode}>
                  {getDeviceDisplayName(device)}
                </Text>
                {hasCustomDeviceName(device) ? (
                  <Text style={styles.myDeviceSubCode} numberOfLines={1}>
                    {device.deviceCode}
                  </Text>
                ) : null}
                {device.address ? (
                  <Text style={styles.myDeviceAddress} numberOfLines={1}>
                    {device.address}
                  </Text>
                ) : (
                  <Text style={styles.myDeviceMissingAddress} numberOfLines={1}>
                    Chưa có địa chỉ — bấm để thiết lập
                  </Text>
                )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 10,
    marginBottom: 32,
    gap: 16,
  },
  chooserTitle: {
    fontWeight: "800",
    fontSize: 26,
    color: Colors.textDark,
    lineHeight: 32,
    marginTop: 14,
  },
  chooserSubtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  modeCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.bgGreenTint,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    borderRadius: 16,
    padding: 18,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  modeIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.successBorder,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    color: Colors.textPrimaryDark,
    fontSize: 16,
    fontWeight: "800",
  },
  modeDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  backText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  flowTitle: {
    fontWeight: "800",
    fontSize: 24,
    color: Colors.textDark,
    lineHeight: 30,
  },
  flowDescription: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  scanButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    shadowColor: Colors.shadowGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  scanButtonIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  scanButtonText: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 17,
    letterSpacing: 0,
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
    fontSize: 28,
    fontWeight: "800",
  },
  addDeviceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.successBg,
    borderWidth: 1,
    borderColor: Colors.successBorder,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addDeviceButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700",
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
  myDeviceSubCode: {
    color: Colors.textPlaceholder,
    fontSize: 12,
    marginTop: 2,
  },
  myDeviceAddress: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  myDeviceMissingAddress: {
    color: Colors.warningOrange,
    fontSize: 13,
    marginTop: 2,
  },
});

export default InitiateChargeComponent;
