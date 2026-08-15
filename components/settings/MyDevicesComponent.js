import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import { useEChargeDeviceQuery } from "../../queries/eChargeDevice.query";
import {
  requestLocationPermissionIfNeeded,
  resolveCurrentPosition,
} from "../../services/location.service";
import deviceLocationChange from "../../utils/deviceLocationChange";
import proximity from "../../utils/proximity";

const { getLocationChangeDecision } = deviceLocationChange;
const { getDeviceCoordinates, MAX_ACCURACY_TOLERANCE_M } = proximity;

const formatMeters = (meters) => {
  if (!Number.isFinite(meters)) return "";
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${Math.round(meters)} m`;
};

const MyDevicesComponent = ({
  myDevicesModalVisible,
  handleCloseMyDevicesModal,
  onDeviceUpdated,
}) => {
  const { data, isLoading } = useEChargeDeviceQuery.useGetMyDevices();
  const updateMyDeviceMutation = useEChargeDeviceQuery.useUpdateMyDevice();

  const devices = Array.isArray(data?.devices) ? data.devices : [];

  // deviceCode của trụ đang mở form. null = đang ở danh sách.
  const [editingCode, setEditingCode] = useState(null);
  const [addressInput, setAddressInput] = useState("");
  // Toạ độ vừa đo, chưa lưu. null = lần lưu này không đụng tới toạ độ.
  const [pendingPosition, setPendingPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  const editingDevice = devices.find(
    (device) => device?.deviceCode === editingCode,
  );

  const openAppSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert(
        "Thông báo",
        "Không thể mở Cài đặt tự động. Vui lòng mở Cài đặt của thiết bị và cấp quyền vị trí cho ứng dụng.",
      );
    }
  };

  const backToList = () => {
    setEditingCode(null);
    setAddressInput("");
    setPendingPosition(null);
  };

  const handleCloseModal = () => {
    backToList();
    handleCloseMyDevicesModal();
  };

  const handlePickDevice = (device) => {
    setEditingCode(device?.deviceCode || null);
    setAddressInput(device?.address ? String(device.address) : "");
    setPendingPosition(null);
  };

  const applyPosition = (position) => {
    setPendingPosition(position);
  };

  // Khác màn quét QR (cố ý không hiện popup xin quyền — xem spec 2026-08-05):
  // ở đây người dùng vừa chủ động bấm một nút ghi rõ là lấy vị trí, nên hỏi
  // quyền tại chỗ là đúng lúc.
  const handleGetCurrentLocation = async () => {
    if (isLocating) return;

    setIsLocating(true);
    try {
      const status = await requestLocationPermissionIfNeeded();

      if (status === "blocked") {
        Alert.alert(
          "Thông báo",
          "Bạn đã từ chối quyền vị trí. Vui lòng mở Cài đặt để bật lại quyền này.",
          [
            { text: "Mở cài đặt", onPress: openAppSettings },
            { text: "Để sau", style: "cancel" },
          ],
        );
        return;
      }

      if (status !== "granted") {
        Alert.alert(
          "Thông báo",
          "Bạn cần cấp quyền vị trí để lấy vị trí của trụ.",
        );
        return;
      }

      const position = await resolveCurrentPosition({});
      const decision = getLocationChangeDecision({
        position,
        device: editingDevice,
      });

      if (decision.type === "unknownPosition") {
        Alert.alert(
          "Không lấy được vị trí",
          "Chưa xác định được vị trí của bạn. Hãy ra chỗ thoáng và thử lại. Vị trí đang lưu của trụ được giữ nguyên.",
        );
        return;
      }

      if (decision.type === "tooInaccurate") {
        Alert.alert(
          "Vị trí chưa đủ chính xác",
          `Máy đang định vị với sai số khoảng ${formatMeters(
            decision.accuracy,
          )}, lớn hơn mức cho phép (${MAX_ACCURACY_TOLERANCE_M} m). ` +
            "Hãy ra chỗ thoáng, tránh trong nhà hoặc dưới hầm, rồi thử lại.",
        );
        return;
      }

      // Chủ trụ đang đứng cách chỗ đã lưu khá xa. Bấm nhầm ở đây là hôm sau về
      // nhà quét QR sẽ bị chặn vì "ngoài bán kính", nên phải hỏi lại rõ ràng.
      if (decision.type === "needsConfirm") {
        Alert.alert(
          "Vị trí mới cách xa vị trí đang lưu",
          `Chỗ bạn đang đứng cách vị trí đang lưu của trụ khoảng ${formatMeters(
            decision.distanceMeters,
          )}. Chỉ xác nhận nếu bạn đang đứng ngay tại trụ.`,
          [
            { text: "Huỷ", style: "cancel" },
            {
              text: "Tôi đang ở trụ",
              onPress: () => applyPosition(position),
            },
          ],
        );
        return;
      }

      applyPosition(position);
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = () => {
    if (updateMyDeviceMutation.isPending || !editingDevice) return;

    const address = addressInput.trim();
    if (!address) {
      Alert.alert("Thông báo", "Vui lòng nhập địa chỉ của trụ.");
      return;
    }

    updateMyDeviceMutation.mutate(
      {
        deviceCode: editingDevice.deviceCode,
        address,
        // Không đo vị trí mới thì bỏ hẳn hai trường này khỏi payload — backend
        // hiểu là giữ nguyên toạ độ đang có.
        latitude: pendingPosition ? pendingPosition.latitude : undefined,
        longitude: pendingPosition ? pendingPosition.longitude : undefined,
      },
      {
        onSuccess: () => {
          backToList();
          onDeviceUpdated?.();
        },
        onError: (error) => {
          Alert.alert(
            "Thông báo",
            error?.response?.data?.message ||
              "Không thể cập nhật thiết bị. Vui lòng thử lại.",
          );
        },
      },
    );
  };

  const renderList = () => {
    if (isLoading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      );
    }

    if (devices.length === 0) {
      return (
        <View style={styles.stateBox}>
          <Ionicons
            name="hardware-chip-outline"
            size={32}
            color={Colors.textPlaceholder}
          />
          <Text style={styles.emptyTitle}>Bạn chưa có trụ nào</Text>
          <Text style={styles.emptyText}>
            Quét mã QR trên trụ sạc tại nhà để thêm trụ vào tài khoản, sau đó
            quay lại đây để đặt địa chỉ và vị trí cho trụ.
          </Text>
        </View>
      );
    }

    return devices.map((device) => {
      const hasCoordinates = !!getDeviceCoordinates(device);

      return (
        <TouchableOpacity
          key={device?.deviceCode || device?._id}
          style={styles.deviceCard}
          onPress={() => handlePickDevice(device)}
          activeOpacity={0.85}
        >
          <View style={styles.deviceCardLeft}>
            <Text style={styles.deviceCode}>{device?.deviceCode}</Text>
            <Text style={styles.deviceAddress} numberOfLines={2}>
              {device?.address || "Chưa có địa chỉ"}
            </Text>

            <View
              style={[
                styles.locationBadge,
                hasCoordinates
                  ? styles.locationBadgeOk
                  : styles.locationBadgeMissing,
              ]}
            >
              <Ionicons
                name={hasCoordinates ? "location" : "location-outline"}
                size={12}
                color={hasCoordinates ? Colors.successGreen : Colors.warningOrange}
              />
              <Text
                style={[
                  styles.locationBadgeText,
                  hasCoordinates
                    ? styles.locationBadgeTextOk
                    : styles.locationBadgeTextMissing,
                ]}
              >
                {hasCoordinates ? "Đã có vị trí" : "Chưa có vị trí"}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textPlaceholder}
          />
        </TouchableOpacity>
      );
    });
  };

  const renderForm = () => (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mã trụ</Text>
        <TextInput
          value={editingDevice?.deviceCode || ""}
          style={[styles.input, styles.inputReadOnly]}
          editable={false}
          selectTextOnFocus={false}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Địa chỉ đặt trụ</Text>
        <TextInput
          value={addressInput}
          onChangeText={setAddressInput}
          style={[styles.input, styles.inputMultiline]}
          placeholder="Ví dụ: Số 5, ngõ 12 Ngõ Quỳnh, Hai Bà Trưng, Hà Nội"
          placeholderTextColor={Colors.textPlaceholder}
          multiline={true}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Vị trí trên bản đồ</Text>

        <Text style={styles.locationHint}>
          Vị trí này dùng để kiểm tra bạn có đang ở cạnh trụ hay không mỗi lần
          quét mã QR. Chỉ bấm nút bên dưới khi bạn đang đứng ngay tại trụ.
        </Text>

        <TouchableOpacity
          style={[
            styles.locationButton,
            isLocating && styles.locationButtonDisabled,
          ]}
          onPress={handleGetCurrentLocation}
          disabled={isLocating}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
          <Text style={styles.locationButtonText}>
            {isLocating
              ? "Đang lấy vị trí..."
              : "Tôi đang đứng tại trụ — lấy vị trí"}
          </Text>
        </TouchableOpacity>

        {pendingPosition ? (
          <Text style={styles.locationPending}>
            Đã lấy vị trí mới
            {Number.isFinite(pendingPosition.accuracy)
              ? ` (sai số khoảng ${formatMeters(pendingPosition.accuracy)})`
              : ""}
            . Bấm Lưu để áp dụng.
          </Text>
        ) : (
          <Text style={styles.locationCurrent}>
            {getDeviceCoordinates(editingDevice)
              ? "Trụ đã có vị trí. Không bấm nút trên thì vị trí cũ được giữ nguyên."
              : "Trụ chưa có vị trí nào."}
          </Text>
        )}
      </View>
    </>
  );

  const isFormMode = !!editingDevice;

  return (
    <Modal
      visible={!!myDevicesModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCloseModal}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBackdrop} onPress={handleCloseModal} />
        <KeyboardAvoidingView
          style={styles.modalCard}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <Ionicons
                  name="hardware-chip-outline"
                  size={18}
                  color={Colors.white}
                />
              </View>

              <View style={styles.headerTextWrap}>
                <Text style={styles.title}>
                  {isFormMode ? "Sửa thông tin trụ" : "Thiết bị"}
                </Text>
                <Text style={styles.subtitle}>
                  {isFormMode
                    ? "Địa chỉ và vị trí của trụ sạc tại nhà"
                    : "Trụ sạc tại nhà đã thêm vào tài khoản"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCloseModal}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={20}
                color={Colors.textSecondaryDark}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {isFormMode ? renderForm() : renderList()}
          </ScrollView>

          {isFormMode && (
            <View style={styles.footerActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.backButton]}
                onPress={backToList}
                disabled={updateMyDeviceMutation.isPending}
              >
                <Text style={styles.backButtonText}>Quay lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.saveButton,
                  updateMyDeviceMutation.isPending && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={updateMyDeviceMutation.isPending}
              >
                <Text style={styles.saveButtonText}>
                  {updateMyDeviceMutation.isPending ? "Đang lưu..." : "Lưu"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayBg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "92%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 8,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimaryDark,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.bgGrayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyScroll: {
    maxHeight: 520,
  },
  stateBox: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 8,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimaryDark,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  deviceCardLeft: {
    flex: 1,
    paddingRight: 10,
  },
  deviceCode: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimaryDark,
  },
  deviceAddress: {
    marginTop: 3,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  locationBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  locationBadgeOk: {
    backgroundColor: Colors.successBgLight,
  },
  locationBadgeMissing: {
    backgroundColor: Colors.bgGrayLight,
  },
  locationBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  locationBadgeTextOk: {
    color: Colors.successGreen,
  },
  locationBadgeTextMissing: {
    color: Colors.warningOrange,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondaryDark,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.textPrimaryDark,
    backgroundColor: Colors.white,
  },
  inputReadOnly: {
    backgroundColor: Colors.bgGrayLight,
    color: Colors.textSecondaryDark,
  },
  inputMultiline: {
    minHeight: 76,
  },
  locationHint: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  locationPending: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.successGreen,
  },
  locationCurrent: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  footerActions: {
    flexDirection: "row",
    marginTop: 14,
    marginBottom: 4,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  backButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondaryDark,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});

export default MyDevicesComponent;
