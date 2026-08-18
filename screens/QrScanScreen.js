import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/color";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEChargeDeviceQuery } from "../queries/eChargeDevice.query";
import eChargeDeviceApi from "../api/eChargeDevice.api";
import claimScanDecision from "../utils/claimScanDecision";
import proximity from "../utils/proximity";
import reviewerAccount from "../utils/reviewerAccount";
import { useAuthStore } from "../stores/auth.store";
import {
  getCurrentPositionIfPermitted,
  prefetchCurrentPosition,
  resetScanPosition,
} from "../services/location.service";

const { getClaimScanDecision, getClaimSuccessDecision } = claimScanDecision;
const { getProximityDecision } = proximity;
const { isReviewerAccount } = reviewerAccount;

const cleanScannedValue = (candidate) => {
  if (candidate === undefined || candidate === null) return null;

  let value = String(candidate).replace(/^\uFEFF/, "").trim();
  if (!value) return null;

  try {
    value = decodeURIComponent(value).trim();
  } catch {
    // QR có ký tự % không hoàn chỉnh vẫn được xử lý như chuỗi thường.
  }

  return value.replace(/^['"]|['"]$/g, "").trim() || null;
};

//từ mã qr ra mã thiết bị
const normalizeScannedCode = (rawData) => {
  const value = cleanScannedValue(rawData);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === "string") {
      return parsed.trim();
    }

    const payload = parsed?.data && typeof parsed.data === "object"
      ? parsed.data
      : parsed;
    const fromObject =
      payload?.deviceCode ||
      payload?.device_code ||
      payload?.deviceId ||
      payload?.device_id ||
      payload?.code ||
      payload?.id;

    if (fromObject) {
      return cleanScannedValue(fromObject);
    }
  } catch (error) {
    // Ignore parse errors and fallback to regex/plain text.
  }

  const queryMatch = value.match(
    /[?&](?:deviceCode|device_code|code)=([^&#]+)/i,
  );
  if (queryMatch?.[1]) {
    return cleanScannedValue(queryMatch[1]);
  }

  // Hỗ trợ QR chứa URL/path hoặc câu chữ có kèm mã trụ, ví dụ
  // https://example.vn/charge/plug_94FB9C.
  const embeddedDeviceCode = value.match(/plug_[a-z0-9_-]+/i)?.[0];
  if (embeddedDeviceCode) return embeddedDeviceCode;

  return value;
};

const QrScanScreen = ({ navigation, route }) => {
  const scannedRef = useRef(false);
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const mode = route?.params?.mode;
  // Luồng nhà dân ("Sạc trụ sạc gia đình") là luồng duy nhất mở màn quét ở mode
  // claim — cả nút "Quét QR thiết bị" lẫn "Thêm thiết bị" đều đi qua đây.
  const isHomeFlow = mode === "claim";
  const user = useAuthStore((state) => state.user);
  const isReviewer = isReviewerAccount(user);
  const claimDeviceMutation = useEChargeDeviceQuery.useClaimDevice();

  // Dùng chung cho cả quyền camera và quyền vị trí — Linking.openSettings mở
  // trang cài đặt của ứng dụng chứ không mở riêng từng quyền.
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

  //luồng xử lý khi người dùng không cấp quyền dùng camera
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
                onPress: openAppSettings,
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
                  onPress: openAppSettings,
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
    [openAppSettings, permission, requestPermission],
  );

  //luồng người dùng xin quyền camera ở máy chưa được cấp
  const handlePermissionAction = useCallback(() => {
    //mở thẳng phần cài đặt để bật quyền thủ công
    if (permission && permission.canAskAgain === false) {
      openAppSettings();
      return;
    }

    ensureCameraPermission();
  }, [ensureCameraPermission, openAppSettings, permission]);

  useFocusEffect(
    useCallback(() => {
      scannedRef.current = false;

      if (!permission?.granted) {
        ensureCameraPermission({ showBlockedAlert: false });
      }

      // Bắt đầu định vị ngay khi mở màn quét, không chờ kết quả. Ở hầm gửi xe
      // lần bắt fix đầu tiên có thể mất hơn 15 giây; nếu đợi tới lúc quét được
      // mã QR mới bắt đầu thì hạn chờ nào cũng hay trượt, và người dùng nhận
      // "Không thể lấy vị trí" dù họ đang đứng ngay cạnh trụ.
      // Luồng nhà dân không còn kiểm tra khoảng cách nên cũng không xin định vị.
      if (!isHomeFlow) {
        prefetchCurrentPosition();
      }

      return () => {
        scannedRef.current = false;
        // Phiên quét sau có thể ở trụ khác — không để nó dùng lại toạ độ đo ở
        // đây.
        resetScanPosition();
      };
    }, [ensureCameraPermission, isHomeFlow, permission?.granted]),
  );

  // alreadyOwned đi kèm để màn Charge chọn đúng câu thông báo: quét trụ nhà dân
  // đã thuộc tài khoản thì không được báo "thành công" như một lần thêm mới.
  const navigateToScannedDevice = useCallback(
    (scannedDeviceCode, { alreadyOwned = false } = {}) => {
      navigation.navigate("Charge", {
        scannedDeviceCode,
        scanToken: Date.now(),
        scanAlreadyOwned: alreadyOwned,
      });
    },
    [navigation],
  );

  // Trụ vừa vào tài khoản chưa có địa chỉ. Mở luôn trang Thiết bị ở chế độ thiết
  // lập thay vì báo "đã thêm thiết bị" rồi để trụ nằm đó không tên không địa chỉ.
  // Vẫn kèm scannedDeviceCode để sau khi lưu xong người dùng ở ngay danh sách ổ
  // sạc của trụ, không phải quét lại.
  const navigateToDeviceSetup = useCallback(
    (scannedDeviceCode) => {
      navigation.navigate("Charge", {
        scannedDeviceCode,
        scanToken: Date.now(),
        setupDeviceCode: scannedDeviceCode,
        setupToken: Date.now(),
      });
    },
    [navigation],
  );

  const showInvalidQrAlert = useCallback(() => {
    Alert.alert(
      "Th\u00f4ng b\u00e1o",
      "M\u00e3 QR kh\u00f4ng h\u1ee3p l\u1ec7. Vui l\u00f2ng th\u1eed qu\u00e9t l\u1ea1i m\u00e3 QR.",
      [
        {
          text: "OK",
          onPress: () => {
            scannedRef.current = false;
          },
        },
      ],
    );
  }, []);

  // Luồng nhà dân đã bỏ kiểm tra khoảng cách; riêng tài khoản duyệt ứng dụng vẫn
  // nhận thông báo ở xa trụ. Giữ người dùng lại màn quét đúng như lời nhắn "lại
  // gần trụ để quét mã" — bắt họ đi lại từ màn chọn loại trụ là thừa.
  const showTooFarFromDeviceAlert = useCallback(() => {
    Alert.alert(
      "Thông báo",
      "Bạn đang ở xa trụ sạc, vui lòng lại gần trụ để quét mã.",
      [
        {
          text: "OK",
          onPress: () => {
            scannedRef.current = false;
          },
        },
      ],
      // Cùng lý do với alertAndLeave: onPress là chỗ duy nhất đặt lại scannedRef.
      { cancelable: false },
    );
  }, []);

  // Đưa người dùng về màn chọn loại trụ. resetChargeFlowToken là cơ chế sẵn có
  // của ChargeScreen (đặt chargeMode về null + dọn state), LatestHistory cũng
  // đang dùng.
  const leaveToChargeModePicker = useCallback(() => {
    scannedRef.current = false;
    navigation.navigate("Charge", { resetChargeFlowToken: Date.now() });
  }, [navigation]);

  const alertAndLeave = useCallback(
    (title, message) => {
      Alert.alert(
        title,
        message,
        [{ text: "OK", onPress: leaveToChargeModePicker }],
        // Không cho đóng bằng nút back của Android: onPress là chỗ duy nhất đặt
        // lại scannedRef, đóng kiểu khác sẽ để máy quét kẹt ở trạng thái đã quét.
        { cancelable: false },
      );
    },
    [leaveToChargeModePicker],
  );

  // Hỏi người dùng có chờ thêm không, thay vì đá họ ra khỏi màn quét. Ở chỗ
  // sóng yếu fix thường về ngay sau lần chờ đầu tiên, nên bắt quét lại từ đầu
  // chỉ tốn thêm thời gian mà không đổi được gì.
  const confirmLocationRetry = useCallback(
    (reason) =>
      new Promise((resolve) => {
        const isServicesDisabled = reason === "servicesDisabled";

        Alert.alert(
          isServicesDisabled
            ? "Định vị của máy đang tắt"
            : "Chưa lấy được vị trí",
          isServicesDisabled
            ? "Hãy bật định vị (GPS) của máy rồi bấm Thử lại."
            : "Máy chưa bắt được tín hiệu vị trí. Hãy đứng cạnh trụ, tránh chỗ khuất rồi bấm Thử lại.",
          [
            { text: "Để sau", style: "cancel", onPress: () => resolve(false) },
            { text: "Thử lại", onPress: () => resolve(true) },
          ],
          // Cùng lý do với alertAndLeave: onPress là chỗ duy nhất kết thúc chờ.
          { cancelable: false },
        );
      }),
    [],
  );

  // Trả true nếu được đi tiếp. Mọi nhánh trả false đều đã tự báo cho người dùng
  // và rời màn quét.
  const passesProximityCheck = useCallback(
    async (deviceResponse) => {
      // C\òn th\ử l\ại ch\ừng n\ào ng\ư\ời d\ùng c\òn mu\ốn ch\ờ. L\ần th\ử sau b\ám v\ào l\ời
      // g\ọi \đ\ịnh v\ị \đang ch\ạy d\ở n\ên kh\ông ph\ải ch\ờ l\ại t\ừ \đ\ầu.
      let locationResult = await getCurrentPositionIfPermitted();

      while (!locationResult.position) {
        if (locationResult.reason === "permission") {
          alertAndLeave(
            "Kh\u00f4ng th\u1ec3 x\u00e1c minh v\u1ecb tr\u00ed",
            "Kh\u00f4ng th\u1ec3 l\u1ea5y t\u1ecda \u0111\u1ed9 hi\u1ec7n t\u1ea1i \u0111\u1ec3 ki\u1ec3m tra kho\u1ea3ng c\u00e1ch v\u1edbi tr\u1ee5 s\u1ea1c.",
          );
          return false;
        }

        if (!(await confirmLocationRetry(locationResult.reason))) {
          leaveToChargeModePicker();
          return false;
        }

        locationResult = await getCurrentPositionIfPermitted();
      }

      const position = locationResult.position;
      const decision = getProximityDecision({
        position,
        device: deviceResponse,
      });

      // Trụ thiếu toạ độ là lỗi dữ liệu vận hành — không chặn người dùng vì một
      // thiếu sót họ không gây ra.
      if (decision.type === "unknownDevice") {
        return true;
      }

      if (decision.type === "unknownPosition") {
        alertAndLeave(
          "Không xác định được vị trí",
          "Không lấy được vị trí của bạn. Vui lòng kiểm tra định vị của máy rồi thử lại.",
        );
        return false;
      }

      if (decision.type === "outOfRange") {
        alertAndLeave(
          "Thông báo",
          "Bạn đang ở ngoài phạm vi trụ sạc.",
        );
        return false;
      }

      return true;
    },
    [alertAndLeave, confirmLocationRetry, leaveToChargeModePicker],
  );

  const handleBarcodeScanned = useCallback(
    async ({ data }) => {
      if (scannedRef.current) {
        return;
      }

      const scannedDeviceCode = normalizeScannedCode(data);
      if (!scannedDeviceCode) {
        Alert.alert(
          "Th\u00f4ng b\u00e1o",
          "M\u00e3 QR kh\u00f4ng h\u1ee3p l\u1ec7. Vui l\u00f2ng th\u1eed qu\u00e9t l\u1ea1i m\u00e3 QR.",
        );
        return;
      }

      scannedRef.current = true;
      setIsCheckingLocation(true);

      try {
        // Lấy thông tin trụ trước khi phân nhánh mode: mọi lần quét đều cần
        // toạ độ trụ để kiểm tra khoảng cách.
        let deviceResponse;

        try {
          deviceResponse = await eChargeDeviceApi.getDevice({
            deviceCode: scannedDeviceCode,
          });
        } catch (error) {
          const status = error?.response?.status;
          if (status === 404 || status === 400) {
            showInvalidQrAlert();
          } else {
            Alert.alert(
              "Không thể kiểm tra mã QR",
              error?.response?.data?.message ||
                "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    scannedRef.current = false;
                  },
                },
              ],
            );
          }
          return;
        }

        // Luồng nhà dân: người dùng quét trụ của chính mình nên không còn kiểm
        // tra khoảng cách. Trụ công cộng vẫn phải đứng trong bán kính trụ.
        if (isHomeFlow) {
          if (isReviewer) {
            showTooFarFromDeviceAlert();
            return;
          }
        } else if (!(await passesProximityCheck(deviceResponse))) {
          return;
        }

        if (!isHomeFlow) {
          navigateToScannedDevice(scannedDeviceCode);
          return;
        }

        const decision = getClaimScanDecision(deviceResponse);

        if (decision.type === "invalid") {
          showInvalidQrAlert();
          return;
        }

        if (decision.type === "singleCharge") {
          navigateToScannedDevice(scannedDeviceCode);
          return;
        }

        claimDeviceMutation.mutate(
          { deviceCode: scannedDeviceCode },
          {
            onSuccess: (claimResponse) => {
              // Backend giữ claim idempotent. Nếu trụ đã có trong tài khoản thì
              // bỏ qua thông báo đã thêm và mở thẳng danh sách ổ sạc.
              if (
                getClaimSuccessDecision(claimResponse).type === 'alreadyOwned'
              ) {
                navigateToScannedDevice(scannedDeviceCode, {
                  alreadyOwned: true,
                });
                return;
              }

              navigateToDeviceSetup(scannedDeviceCode);
            },
            onError: (error) => {
              const message =
                error?.response?.data?.message ||
                "Kh\u00f4ng th\u1ec3 th\u00eam thi\u1ebft b\u1ecb. Vui l\u00f2ng th\u1eed l\u1ea1i.";
              Alert.alert("Th\u00f4ng b\u00e1o", message, [
                {
                  text: "OK",
                  onPress: () => {
                    scannedRef.current = false;
                  },
                },
              ]);
            },
          },
        );
      } finally {
        setIsCheckingLocation(false);
      }
    },
    [
      isHomeFlow,
      isReviewer,
      claimDeviceMutation,
      navigateToDeviceSetup,
      navigateToScannedDevice,
      passesProximityCheck,
      showInvalidQrAlert,
      showTooFarFromDeviceAlert,
    ],
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
        {/* Chỉ render camera khi tab này đang focus. Trước đây camera bị gỡ
            qua unmountOnBlur ở cấp Tab.Navigator (AppNavigator.js) — trên
            Android, SurfaceView của camera bị hệ thống huỷ ở một nhịp khác
            với lúc React Navigation đổi tab, tạo ra một khung hình đen (như
            "bóng đen") thoáng qua ngay khi rời màn, đúng lúc guideText biến
            mất theo camera. Tự gỡ camera ngay khi mất focus (đồng bộ với
            focus state, không chờ Tab.Navigator huỷ toàn màn) tránh được
            khung hình đen đó. */}
        {isFocused && (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarcodeScanned}
            />

            {isCheckingLocation ? (
              // Bước kiểm tra vị trí có thể mất vài giây ở nơi GPS yếu (hầm gửi
              // xe) — không có chỉ báo thì người dùng tưởng máy treo. Luồng nhà
              // dân chỉ còn gọi API tra trụ nên nhãn phải nói đúng việc đang làm.
              <View style={styles.checkingOverlay}>
                <ActivityIndicator size="large" color={Colors.white} />
                <Text style={styles.checkingText}>
                  {isHomeFlow ? "Đang kiểm tra mã QR…" : "Đang kiểm tra vị trí…"}
                </Text>
              </View>
            ) : (
              <View style={styles.overlay} pointerEvents="none">
                <View style={styles.scanFrame} />
                <Text style={styles.guideText}>Quét mã Qr trên trụ sạc</Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Charge")}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
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
    backgroundColor: Colors.black,
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
    borderColor: Colors.white,
    backgroundColor: Colors.whiteTranslucent05,
  },
  checkingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.overlayBgDark,
  },
  checkingText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  guideText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.overlayBgDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backText: {
    color: Colors.white,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: Colors.white,
  },
  permissionTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textDark,
  },
  permissionDescription: {
    marginTop: 10,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: Colors.white,
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
