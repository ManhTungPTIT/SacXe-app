import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/color";
import permissionSettingsRows from "../../utils/permissionSettingsRows";
import permissionCopy from "../../utils/permissionCopy";
import {
  getLocationPermissionStatus,
  requestLocationPermissionIfNeeded,
} from "../../services/location.service";
import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from "../../services/notification.service";
import {
  getCameraPermissionStatus,
  getMediaLibraryPermissionStatus,
  requestCameraPermission,
  requestMediaLibraryPermission,
} from "../../services/mediaPermission";

const { buildPermissionRows } = permissionSettingsRows;
const { PERMISSION_KEYS } = permissionCopy;

// Mục "Cài đặt quyền" trong màn Tài khoản: nơi người dùng CHỦ ĐỘNG đi tìm để
// bật lại quyền đã lỡ từ chối.
//
// Spec: docs/superpowers/specs/2026-08-19-permission-settings-screen-design.md
//
// Vì sao cần: hệ điều hành không cho hỏi lại sau khi bị từ chối (iOS hỏi đúng
// một lần trong đời bản cài; Android khoá sau hai lần). Các Alert + openSettings
// rải ở QrScanScreen/HomeScreen/BikeRegistration chỉ bật lên đúng lúc người dùng
// vừa chạm vào tính năng — không có lối vào chủ động nào trước màn này.

// Ánh xạ từ khoá quyền sang cặp hàm đọc/xin của nó. Để ở đây chứ không ở
// utils/permissionSettingsRows.js vì phần thuần đó không được phép import
// service (nó phải chạy được dưới `node --test`, không có React Native).
const PERMISSION_ACTIONS = {
  [PERMISSION_KEYS.LOCATION]: {
    icon: "location-outline",
    read: getLocationPermissionStatus,
    request: requestLocationPermissionIfNeeded,
  },
  [PERMISSION_KEYS.CAMERA]: {
    icon: "camera-outline",
    read: getCameraPermissionStatus,
    request: requestCameraPermission,
  },
  [PERMISSION_KEYS.PHOTO_LIBRARY]: {
    icon: "images-outline",
    read: getMediaLibraryPermissionStatus,
    request: requestMediaLibraryPermission,
  },
  [PERMISSION_KEYS.NOTIFICATIONS]: {
    icon: "notifications-outline",
    read: getNotificationPermissionStatus,
    request: requestNotificationPermission,
  },
};

const readAllStatuses = async () => {
  const keys = Object.keys(PERMISSION_ACTIONS);
  const results = await Promise.all(
    keys.map((key) => PERMISSION_ACTIONS[key].read()),
  );

  return keys.reduce(
    (accumulator, key, index) => ({ ...accumulator, [key]: results[index] }),
    {},
  );
};

const PermissionSettingsComponent = ({ visible, onClose }) => {
  const { height: screenHeight } = useWindowDimensions();
  const [statuses, setStatuses] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const refreshStatuses = useCallback(async () => {
    setStatuses(await readAllStatuses());
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    let isActive = true;

    readAllStatuses().then((next) => {
      if (isActive) setStatuses(next);
    });

    return () => {
      isActive = false;
    };
  }, [visible]);

  // Người dùng bật quyền bên trang Cài đặt của máy rồi quay lại: phải đọc lại
  // ngay, không bắt họ đóng mở modal mới thấy đổi.
  useEffect(() => {
    if (!visible) return undefined;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshStatuses();
      }
    });

    return () => subscription.remove();
  }, [visible, refreshStatuses]);

  const openAppSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert(
        "Thông báo",
        "Vui lòng vào phần Cài đặt của thiết bị để bật quyền cho ứng dụng.",
      );
    }
  }, []);

  // Bấm nút là đi đúng đường của lần hỏi đầu tiên: popup giải thích của app
  // (services/permissionPriming.js) rồi tới hộp thoại của thiết bị. Kể cả khi
  // trạng thái đọc được là "blocked" — xem ghi chú trong
  // utils/permissionSettingsRows.js để biết vì sao không được tin `canAskAgain`.
  //
  // Chỉ khi hệ điều hành trả về "blocked" SAU khi đã hỏi thật thì mới biết chắc
  // nó không vẽ hộp thoại nào. Lúc đó mới mời vào Cài đặt — bước sau, không phải
  // bước thay thế. Không có nhánh này thì người bị chặn bấm nút xong không thấy
  // gì xảy ra, đúng thứ màn này sinh ra để tránh.
  const handleRowAction = useCallback(
    async (row) => {
      setBusyKey(row.key);

      let result = null;
      try {
        result = await PERMISSION_ACTIONS[row.key].request();
      } finally {
        setBusyKey(null);
        await refreshStatuses();
      }

      if (result !== "blocked") return;

      Alert.alert(
        row.title,
        "Thiết bị đã chặn quyền này nên không thể hỏi lại từ trong ứng dụng. Vào Cài đặt để bật thủ công.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Mở Cài đặt", onPress: openAppSettings },
        ],
      );
    },
    [openAppSettings, refreshStatuses],
  );

  // Gạt tắt một quyền đang được cấp. iOS và Android không cho app thu hồi
  // quyền của chính nó — chỉ có đường xin, không có đường trả — nên tất cả
  // những gì làm được là dẫn người dùng sang trang Cài đặt của máy.
  //
  // Công tắc KHÔNG nhúc nhích ở đây. Nó lấy giá trị từ trạng thái thật, nên
  // bấm "Để sau" thì nó đứng yên ở vị trí bật — đúng sự thật, quyền vẫn đang
  // được cấp. Nếu người dùng tắt thật bên Cài đặt, AppState listener phía trên
  // đọc lại và công tắc tự trượt sang tắt.
  const confirmManualRevoke = useCallback(
    (row) => {
      Alert.alert(
        row.title,
        "Vui lòng mở Cài đặt để quản lý quyền ứng dụng.",
        [
          { text: "Để sau", style: "cancel" },
          { text: "Mở Cài đặt", onPress: openAppSettings },
        ],
      );
    },
    [openAppSettings],
  );

  const handleToggle = useCallback(
    (row) => {
      if (row.intent === "revoke") {
        confirmManualRevoke(row);
        return;
      }

      handleRowAction(row);
    },
    [confirmManualRevoke, handleRowAction],
  );

  const rows = buildPermissionRows({
    statuses,
    infoPlist: Constants.expoConfig?.ios?.infoPlist,
  });
  const listMaxHeight = Math.min(screenHeight * 0.6, 460);

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>Cài đặt quyền</Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.8}
              onPress={onClose}
            >
              <Ionicons name="close" size={18} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={[styles.listScroll, { maxHeight: listMaxHeight }]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {rows.map((row) => {
              // Khoá công tắc khi đang chờ hộp thoại hệ điều hành, và khi chưa
              // đọc xong trạng thái lần đầu (`statuses` còn null) — lúc đó mọi
              // dòng đang hiển thị mặc định "chưa cấp", gạt vào là gạt trúng
              // một giá trị chưa có thật.
              const isLocked = busyKey === row.key || statuses === null;

              return (
                <View key={row.key} style={styles.permissionItem}>
                  <View style={styles.permissionIconWrapper}>
                    <Ionicons
                      name={PERMISSION_ACTIONS[row.key].icon}
                      size={18}
                      color={Colors.primary}
                    />
                  </View>

                  <View style={styles.permissionContent}>
                    <Text style={styles.permissionTitle} numberOfLines={1}>
                      {row.title}
                    </Text>
                    <Text style={styles.permissionBody}>{row.body}</Text>
                  </View>

                  <Switch
                    value={row.enabled}
                    onValueChange={() => handleToggle(row)}
                    disabled={isLocked}
                    trackColor={{
                      false: Colors.borderMuted,
                      true: Colors.primary,
                    }}
                    thumbColor={Colors.white}
                    ios_backgroundColor={Colors.borderMuted}
                    style={styles.permissionSwitch}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayBgLight,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    width: "100%",
    maxHeight: "90%",
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: Colors.textDarkGray,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.borderMuted,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textDarkGray,
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: Colors.textSlate,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgLightMuted,
  },
  listScroll: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: 6,
    paddingBottom: 8,
  },
  permissionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgLightMuted,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    padding: 11,
    marginBottom: 10,
  },
  permissionIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    marginRight: 10,
  },
  permissionContent: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimaryDark,
  },
  permissionBody: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textSecondaryDark,
  },
  permissionSwitch: {
    marginLeft: 10,
  },
});

export default PermissionSettingsComponent;
