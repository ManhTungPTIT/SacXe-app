import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import BikeRegistration from "../components/bike/BikeRegistration";
import { useBike } from "../queries/bike.query";
import { useAuth } from "../queries/auth.query";
import ToastNotification from "../components/ToastNotification";
import InitiateChargeComponent from "../components/bike/InitiateChargeComponent";
import ChargingStatusComponent from "../components/charging/ChargingStatusComponent";
import ChargingDeviceCheck from "../components/charging/ChargingDeviceCheck";
import { useChargeQuery } from "../queries/charge.query";
import { useEChargeDeviceQuery } from "../queries/eChargeDevice.query";
import { useHistory } from "../queries/history.query";
import { Colors } from "../constants/color";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect } from "@react-navigation/native";
import { socket } from "../services/socket.service";

// Phần cứng gửi telemetry mỗi ~5s (xem comment TELEMETRY_TIMEOUT_MS ở
// backend/src/configs/mqtt.config.js) — backend tự cho phép trễ tới 15000ms
// (~3 nhịp) mới kết luận "mất tín hiệu". 5000ms cũ (đúng 1 nhịp, không chừa
// margin) khiến 1 thiết bị hoàn toàn bình thường, chỉ lệch nhịp phát gói đầu
// tiên một chút (jitter mạng, hoặc lệnh bật sạc rơi ngay sau khi 1 chu kỳ
// vừa kết thúc) cũng bị coi là "không có thiết bị" và bị tự ngắt — sai gần
// như luôn xảy ra chứ không phải hiếm. Đặt dài hơn ngưỡng backend một chút
// để timeout cục bộ này chỉ thực sự là fallback cuối cùng (mất kết nối
// socket...), còn thiết bị thật luôn được xác nhận qua wave_data/sự kiện
// backend trước khi chạm ngưỡng này.
const DEVICE_CHECK_TIMEOUT_MS = 16 * 1000;
const FINAL_TELEMETRY_GRACE_MS = 400;

const ChargeScreen = ({ route, navigation }) => {
  const queryClient = useQueryClient();
  const [devices, setDevices] = useState([]);
  const [isScanned, setIsScanned] = useState(() => {
    return !!queryClient.getQueryData(["SCANNED_DEVICE_CODE"]);
  });
  const [deviceCode, setdeviceCode] = useState(() => {
    return queryClient.getQueryData(["SCANNED_DEVICE_CODE"]) || null;
  });
  const [powerId, setPowerId] = useState(null);
  const [chargeMode, setChargeMode] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [deviceCheck, setDeviceCheck] = useState(null);
  const [initialChargingTelemetry, setInitialChargingTelemetry] = useState(null);
  // Chặn màn "đang sạc" hiện ra dù chỉ 1 nhịp khi vừa kết luận không có thiết
  // bị: setDeviceCheck(null) áp dụng ngay, nhưng cache bike.isCharging=false
  // (set qua queryClient trong syncStoppedChargeState) có thể lan tới re-render
  // chậm hơn 1 nhịp -> lúc đó deviceCheck đã null mà bike.isCharging vẫn còn
  // true (cũ), lọt vào nhánh ChargingStatusComponent rồi mới tự thoát ra.
  const noDeviceConfirmedRef = useRef(false);

  const {
    data: bike,
    isLoading: isLoadingBikeData,
    isError,
    refetch: refetchBike,
  } = useBike.useGetMyBike();
  const {
    data: latestHistory,
    refetch: refetchLatestHistory,
  } = useHistory.useGetLatestHistory();
  const { data: userData } = useAuth.useGetMe();
  const walletBalance = userData?.user?.balance;
  const terminateChargeMutation = useChargeQuery.useTerminate();
  const {
    data: eChargeDevices,
    isLoading: isDeviceLoading,
    isError: isDeviceError,
  } = useEChargeDeviceQuery.useGetDevices({
    deviceCode,
  });

  const selectedChargeDevice =
    eChargeDevices?.eChargeDevices ||
    eChargeDevices?.device ||
    eChargeDevices?.data ||
    eChargeDevices;
  const isSelectedHouseDevice =
    selectedChargeDevice?.isHouse === true ||
    selectedChargeDevice?.isHouse === "true";
  const deviceId = selectedChargeDevice?._id || null;
  const chargingStartTime = latestHistory?.startTime || latestHistory?.createdAt;
  const initialEnergyKwh =
    Number(latestHistory?.lastKnownEnergy ?? latestHistory?.energy ?? 0) || 0;
  const hasFinalizedLatestHistory = Boolean(
    latestHistory?.totalTime || latestHistory?.clientSessionStopped,
  );
  const isChargingSessionActive = Boolean(
    bike?.bike?.isCharging && !hasFinalizedLatestHistory,
  );
  const isStopping =
    terminateChargeMutation.isLoading || terminateChargeMutation.isPending;
  // Giữ màn hình ở trạng thái "đang sạc" trong lúc chính nút Dừng sạc còn chờ
  // API — nếu không, một refetch nền không liên quan (vd. latestHistory tự
  // invalidate theo năng lượng realtime ở LatestHistory.js) có thể thấy
  // History đã totalTime (backend ghi DB giữa chừng, trước khi HTTP response
  // trả về) và chuyển màn sớm, trước khi mutation của nút bấm kịp resolve.
  const displayChargingSession =
    !noDeviceConfirmedRef.current && (isChargingSessionActive || isStopping);

  useFocusEffect(
    useCallback(() => {
      refetchBike();
      refetchLatestHistory();
    }, [refetchBike, refetchLatestHistory]),
  );

  useEffect(() => {
    queryClient.setQueryData(["SCANNED_DEVICE_CODE"], deviceCode);
  }, [deviceCode, queryClient]);

  useEffect(() => {
    const scannedDeviceCode = route?.params?.scannedDeviceCode;
    const scanToken = route?.params?.scanToken;

    if (!scanToken || !scannedDeviceCode) {
      return;
    }

    setDevices([]);
    setPowerId(null);
    setdeviceCode(String(scannedDeviceCode));
    setIsScanned(true);

    // Show heads-up notification for successful QR scan
    setToastType("success");
    setToastMessage("Quét mã QR tại trụ sạc thành công!");
    setToastVisible(true);

    navigation.setParams({
      scannedDeviceCode: undefined,
      scanToken: undefined,
    });
  }, [route?.params?.scanToken, route?.params?.scannedDeviceCode, navigation]);
  useEffect(() => {
    const resetChargeFlowToken = route?.params?.resetChargeFlowToken;

    if (!resetChargeFlowToken) {
      return;
    }

    setDevices([]);
    setIsScanned(false);
    setdeviceCode(null);
    setPowerId(null);
    setChargeMode(null);
    setDeviceCheck(null);
    noDeviceConfirmedRef.current = false;
    navigation.setParams({
      resetChargeFlowToken: undefined,
      scannedDeviceCode: undefined,
      scanToken: undefined,
      openHomeDevicesToken: undefined,
      isUpdating: false,
    });
  }, [route?.params?.resetChargeFlowToken, navigation]);



  useEffect(() => {
    if (isScanned && deviceCode && !isDeviceLoading) {
      if (!eChargeDevices || isDeviceError) {
        Alert.alert("Thông báo", "Mã QR không hợp lệ. Vui lòng thử lại.");
        setIsScanned(false);
        setdeviceCode(null);
      } else {
        setChargeMode(isSelectedHouseDevice ? "home" : "public");
      }
    }
  }, [
    isScanned,
    deviceCode,
    eChargeDevices,
    isDeviceLoading,
    isDeviceError,
    isSelectedHouseDevice,
  ]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      if (route?.params?.isUpdating) {
        navigation.setParams({ isUpdating: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route?.params?.isUpdating]);

  const syncStoppedChargeState = ({ deferBackendConfirm = false } = {}) => {
    const activeDeviceCode = deviceCode || latestHistory?.deviceId?.deviceCode;
    const activePowerId =
      powerId || latestHistory?.powerId?._id || latestHistory?.powerId;
    const activePowerIndex = latestHistory?.powerId?.index || latestHistory?.powerIndex;

    queryClient.setQueryData(["USERS_BIKE"], (oldData) => {
      if (!oldData?.bike) {
        return oldData;
      }

      return {
        ...oldData,
        bike: {
          ...oldData.bike,
          isCharging: false,
        },
      };
    });

    // Trả ổ vừa dùng về trạng thái rảnh ngay trên cache để UI chuyển xanh tức
    // thì; request invalidate bên dưới vẫn chạy nền để xác nhận lại với BE.
    if (activeDeviceCode) {
      queryClient.setQueryData(
        ["E_CHARGE_DEVICE", String(activeDeviceCode)],
        (oldData) => {
          if (!oldData) return oldData;

          const releaseOutlet = (outlet) => {
            const matchesId =
              activePowerId && String(outlet?._id) === String(activePowerId);
            const matchesIndex =
              activePowerIndex &&
              Number(outlet?.index) === Number(activePowerIndex);

            return matchesId || matchesIndex
              ? { ...outlet, isUsing: false }
              : outlet;
          };

          const updateOutlets = (value) =>
            Array.isArray(value) ? value.map(releaseOutlet) : value;

          return {
            ...oldData,
            powerOutlets: updateOutlets(oldData.powerOutlets),
            data: oldData.data
              ? {
                  ...oldData.data,
                  powerOutlets: updateOutlets(oldData.data.powerOutlets),
                }
              : oldData.data,
          };
        },
      );
    }

    // deferBackendConfirm: dùng khi CHÍNH client là bên vừa quyết định "không
    // có thiết bị" (timeout cục bộ) và request dừng phiên còn đang gửi song
    // song, CHƯA có kết quả — refetch ngay lúc này gần như chắc chắn nhận về
    // dữ liệu cũ (isUsing/isCharging vẫn true, vì backend chưa kịp xử lý),
    // đè mất patch optimistic vừa set phía trên -> ổ hiện lại "Đang dùng"
    // vài giây oan uổng trước khi có refetch khác (không chắc chắn) sửa lại.
    // Optimistic patch ở trên đã đủ để UI đúng ngay; việc refetch xác nhận
    // lại với BE để bên gọi tự làm SAU KHI request dừng phiên thực sự xong.
    if (!deferBackendConfirm) {
      queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      if (activeDeviceCode) {
        queryClient.invalidateQueries({ queryKey: ["E_CHARGE_DEVICE", String(activeDeviceCode)] });
      }
    }

    if (activeDeviceCode) {
      setdeviceCode(String(activeDeviceCode));
      setIsScanned(true);
      setPowerId(null);
    } else {
      setDevices([]);
      setIsScanned(false);
      setdeviceCode(null);
      setPowerId(null);
    }
  };

  useEffect(() => {
    if (!deviceCheck) {
      return undefined;
    }

    let finished = false;
    let terminationStarted = false;
    let finalGraceTimeoutId = null;

    const finishWithDevice = (telemetry) => {
      // Không được báo kết nối thành công sau khi request kết thúc phiên đã gửi.
      // Nếu không, UI sẽ vào phiên sạc rồi lập tức bị đẩy ra ngoài.
      if (finished || terminationStarted) return;
      finished = true;
      setInitialChargingTelemetry(telemetry || null);
      setDeviceCheck(null);
      queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      refetchBike();
      refetchLatestHistory();
      setToastType("success");
      setToastMessage("Đã phát hiện thiết bị. Bắt đầu phiên sạc!");
      setToastVisible(true);
    };

    const finishWithoutDevice = ({ deferBackendConfirm = false } = {}) => {
      if (finished) return;
      finished = true;
      noDeviceConfirmedRef.current = true;
      setDeviceCheck(null);
      syncStoppedChargeState({ deferBackendConfirm });
      setToastType("warning");
      setToastMessage(
        "Không phát hiện thiết bị sạc. Vui lòng cắm thiết bị vào ổ sạc.",
      );
      setToastVisible(true);
    };

    const handleWaveData = (data) => {
      const power = Number(data?.power);
      if (Number.isFinite(power) && power > 0) {
        finishWithDevice(data);
      }
    };

    const handleBillingUpdate = (data) => {
      const message = String(data?.message || "").toLowerCase();
      if (
        data?.type === "auto_stopped" &&
        (message.includes("không có thiết bị") || message.includes("khong co thiet bi"))
      ) {
        finishWithoutDevice();
      }
    };

    // Backend báo "mất tín hiệu thiết bị" qua charge_device_status (offline)
    // gần như ngay lập tức — sớm hơn nhiều so với charge_billing_update và
    // sớm hơn timeout cục bộ DEVICE_CHECK_TIMEOUT_MS. Không lắng nghe sự
    // kiện này khiến màn hình kiểm tra kết nối bị kẹt lại (đứng lâu, bấm OK
    // ở Alert toàn cục ở RootNavigator xong vẫn không thoát) cho tới khi hết
    // đúng DEVICE_CHECK_TIMEOUT_MS.
    //
    // charge_device_status "offline" được backend dùng cho NHIỀU tình huống
    // khác nhau (xem backend/src/services/charge.service.js), chỉ 2 lý do
    // dưới đây thực sự là "phiên bị huỷ vì mất tín hiệu/không có thiết bị"
    // (từ handleDeviceSignalLost, có gọi finalizeChargeSession):
    // "no_signal" | "signal_lost". Các lý do khác — "no electric" (một gói
    // telemetry lẻ báo power=0, kể cả gói ĐẦU TIÊN lúc xe vừa bắt đầu bắt tay
    // trước khi kéo dòng thật, hoàn toàn bình thường) và "maintenance" (quét
    // cả trụ offline) — KHÔNG hề huỷ phiên ở backend, nên không được coi là
    // "không có thiết bị" ở đây. Nếu không lọc theo reason, một gói 0W thoáng
    // qua ngay lúc vừa bật sạc sẽ khiến phiên đang sạc thật bị đẩy ra ngoài.
    const SIGNAL_LOST_REASONS = new Set(["no_signal", "signal_lost"]);
    const handleDeviceStatus = (data) => {
      if (String(data?.state || "").toLowerCase() !== "offline") return;
      if (!SIGNAL_LOST_REASONS.has(String(data?.reason || ""))) return;

      const eventDeviceCode = data?.deviceCode ?? data?.deviceId ?? data?.device_id;
      const eventPowerIndex = data?.powerIndex;

      const matchesDevice =
        eventDeviceCode === undefined ||
        eventDeviceCode === null ||
        String(eventDeviceCode) === String(deviceCheck.deviceCode || "");
      const matchesPower =
        eventPowerIndex === undefined ||
        eventPowerIndex === null ||
        Number(eventPowerIndex) === Number(deviceCheck.powerIndex);

      if (matchesDevice && matchesPower) {
        finishWithoutDevice();
      }
    };

    socket.on("wave_data", handleWaveData);
    socket.on("charge_billing_update", handleBillingUpdate);
    socket.on("charge_device_status", handleDeviceStatus);

    const timeoutId = setTimeout(() => {
      if (finished) return;

      // Chừa phần cuối của tổng DEVICE_CHECK_TIMEOUT_MS cho gói telemetry
      // đang trên đường tới. Tổng thời gian màn check vẫn không vượt quá
      // DEVICE_CHECK_TIMEOUT_MS.
      finalGraceTimeoutId = setTimeout(() => {
        if (finished) return;

        terminationStarted = true;
        // Cập nhật UI (thoát màn check, trả ổ về "Có thể sử dụng") NGAY —
        // không chờ round-trip HTTP của terminateChargeMutation mới cập
        // nhật, vì lúc này app đã tự quyết định "không có thiết bị" dựa
        // trên timeout cục bộ, không cần xác nhận thêm từ response mới dám
        // cập nhật UI.
        //
        // deferBackendConfirm=true: KHÔNG để syncStoppedChargeState tự
        // invalidate/refetch ngay — lúc này backend CHƯA chắc đã xử lý xong
        // (request dừng phiên bên dưới còn chưa có kết quả), refetch ngay sẽ
        // nhận về dữ liệu cũ (vẫn isUsing/isCharging=true) đè lên đúng patch
        // optimistic vừa set, khiến ổ hiện lại "Đang dùng" vài giây oan uổng.
        // Tự invalidate lại ở đây, SAU KHI request dừng phiên đã có kết quả
        // (onSettled — dù thành công hay báo "đã dừng" do backend tự xử lý
        // trước), để lần refetch xác nhận chắc chắn lấy được dữ liệu mới.
        finishWithoutDevice({ deferBackendConfirm: true });

        const confirmDeviceCode =
          deviceCode || latestHistory?.deviceId?.deviceCode;
        terminateChargeMutation.mutate(
          {},
          {
            onSettled: () => {
              queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
              queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
              if (confirmDeviceCode) {
                queryClient.invalidateQueries({
                  queryKey: ["E_CHARGE_DEVICE", String(confirmDeviceCode)],
                });
              }
            },
          },
        );
      }, FINAL_TELEMETRY_GRACE_MS);
    }, DEVICE_CHECK_TIMEOUT_MS - FINAL_TELEMETRY_GRACE_MS);

    return () => {
      clearTimeout(timeoutId);
      if (finalGraceTimeoutId) clearTimeout(finalGraceTimeoutId);
      socket.off("wave_data", handleWaveData);
      socket.off("charge_billing_update", handleBillingUpdate);
      socket.off("charge_device_status", handleDeviceStatus);
    };
  }, [deviceCheck]);

  if (isLoadingBikeData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  const executeStopCharging = () => {
    terminateChargeMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          syncStoppedChargeState();

          setToastType("success");
          setToastMessage("Dừng sạc xe thành công!");
          setToastVisible(true);
        },
        onError: (error) => {
          const errorMessage = error?.response?.data?.message || "";

          if (errorMessage.includes("Xe chưa đang")) {
            syncStoppedChargeState();
            setToastType("success");
            setToastMessage("Phiên sạc đã được cập nhật.");
            setToastVisible(true);
            return;
          }

          Alert.alert(
            "Thông báo",
            errorMessage || "Không thể dừng sạc. Vui lòng thử lại.",
          );
        },
      },
    );
  };

  const handleStopCharging = () => {
    if (isStopping) return;
    Alert.alert(
      "Thông báo",
      "Bạn có chắc chắn muốn dừng sạc không?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xác nhận",
          onPress: executeStopCharging,
        },
      ],
      { cancelable: true },
    );
  };

  const isUpdating = route?.params?.isUpdating;
  const requiresPublicBikeRegistration =
    !bike?.bike && chargeMode === "public";
  const showBikeRegistration =
    Boolean(isUpdating) || requiresPublicBikeRegistration;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {!showBikeRegistration ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.page}>
              <View style={styles.headerSection}>
                <Text style={styles.screenTitle}>Phiên sạc</Text>
              </View>

              {deviceCheck ? (
                <ChargingDeviceCheck
                  deviceCode={deviceCheck.deviceCode}
                  powerIndex={deviceCheck.powerIndex}
                />
              ) : displayChargingSession ? (
                <>
                  <ChargingStatusComponent
                    chargingStartTime={chargingStartTime}
                    initialEnergyKwh={initialEnergyKwh}
                    latestHistory={latestHistory}
                    bike={bike?.bike}
                    balance={walletBalance}
                    onStopCharging={handleStopCharging}
                  isStopping={isStopping}
                  initialTelemetry={initialChargingTelemetry}
                  />
                </>
              ) : (
                <InitiateChargeComponent
                  navigation={navigation}
                  devices={eChargeDevices}
                  setDevices={setDevices}
                  isScanned={isScanned}
                  setIsScanned={setIsScanned}
                  deviceCode={deviceCode}
                  setdeviceCode={setdeviceCode}
                  setPowerId={setPowerId}
                  deviceId={deviceId}
                  mode={chargeMode}
                  setMode={setChargeMode}
                  openHomeDevicesToken={route?.params?.openHomeDevicesToken}
                  onScanQrPress={(params) =>
                    navigation.navigate("ScanQR", params)
                  }
                  onChargeStarted={(charge) => {
                    noDeviceConfirmedRef.current = false;
                    queryClient.setQueryData(["USERS_BIKE"], (current) => ({
                      ...(current || {}),
                      bike: charge?.bike || {
                        ...(current?.bike || {}),
                        isCharging: true,
                      },
                    }));
                    setDeviceCheck({
                      deviceCode: charge?.deviceCode || deviceCode,
                      powerIndex: charge?.powerIndex,
                    });
                    queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
                    queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
                  }}
                />
              )}
            </View>
          </ScrollView>
        ) : (
          <BikeRegistration
            isUpdating={isUpdating}
            onCancel={() => {
              if (isUpdating) {
                navigation.setParams({ isUpdating: false });
              } else {
                setChargeMode(null);
              }
            }}
            onSuccess={() => {
              setToastType("success");
              setToastMessage(isUpdating ? "Cập nhật giấy tờ xe thành công!" : "Đăng ký xe thành công!");
              setToastVisible(true);
              refetchBike();
              if (isUpdating) {
                navigation.setParams({ isUpdating: false });
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
      <ToastNotification
        visible={toastVisible}
        title={toastType === "warning" ? "Thất bại" : "Thành công"}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: "500",
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  page: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.secondary,
  },
  headerSection: {
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 24,
    marginHorizontal: -24,
  },
});

export default ChargeScreen;
