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
  TouchableOpacity,
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
import {
  beginManualChargeStop,
  cancelManualChargeStop,
  cancelPendingChargeNotification,
  completeManualChargeStop,
  confirmChargeDeviceCheck,
  markChargeDeviceMissing,
  setChargeDeviceCheckInProgress,
} from "../services/notification.service";
import MyDevicesComponent from "../components/settings/MyDevicesComponent";
import deviceDisplayName from "../utils/deviceDisplayName";
import sessionEnergySeed from "../utils/sessionEnergySeed";
import activeSessionPick from "../utils/activeSessionPick";
import claimScanDecision from "../utils/claimScanDecision";
import chargeScreenTitle from "../utils/chargeScreenTitle";
import publicChargeSteps from "../utils/publicChargeSteps";
import ChargeStepper from "../components/charging/ChargeStepper";

const { getDeviceDisplayName } = deviceDisplayName;

const { resolveSessionSeedEnergyKwh, resolveSessionStartTime, resolveSessionKey } =
  sessionEnergySeed;
const { getActiveSessions, pickActiveSession } = activeSessionPick;
const { getScanToastMessage } = claimScanDecision;
const { getChargeScreenTitle } = chargeScreenTitle;
const { resolvePublicChargeStep } = publicChargeSteps;

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
  // "Người này bước vào luồng công cộng khi chưa có giấy tờ xe" — chốt MỘT LẦN
  // lúc họ chọn loại trụ, không đọc lại !bike ở mỗi lần render.
  //
  // Đọc lại mỗi render thì cờ tắt ngay khi giấy tờ đăng ký xong, tức đúng lúc
  // người dùng sang bước 2: họ sẽ không bao giờ thấy hai bước "Quét mã trụ" và
  // "Chọn ổ sạc" được đánh dấu, mà đó mới là phần hướng dẫn có ích.
  const [isPublicOnboarding, setIsPublicOnboarding] = useState(false);
  // Mã trụ vừa claim đang chờ thiết lập (tên + địa chỉ + vị trí). Khác null là
  // modal Trụ sạc tại nhà đang mở ở chế độ bắt buộc — xem MyDevicesComponent.
  const [setupDeviceCode, setSetupDeviceCode] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [deviceCheck, setDeviceCheck] = useState(null);
  const [initialChargingTelemetry, setInitialChargingTelemetry] = useState(null);
  const [confirmedChargingStartTime, setConfirmedChargingStartTime] = useState(null);
  const [selectedActiveHistoryId, setSelectedActiveHistoryId] = useState(null);
  // Keep the charging session visible while bike/history syncs after detection.
  const [isConfirmedSessionPendingSync, setIsConfirmedSessionPendingSync] =
    useState(false);
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
    data: latestHistoryData,
    refetch: refetchLatestHistory,
  } = useHistory.useGetLatestHistory();
  const {
    data: activeSessionsData,
    refetch: refetchActiveSessions,
  } = useHistory.useGetActiveSessions();
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
  const activeSessions = getActiveSessions(activeSessionsData);
  const latestHistory =
    pickActiveSession(activeSessionsData, {
      selectedHistoryId: selectedActiveHistoryId,
      deviceCode,
      powerId,
    }) || latestHistoryData;
  // KHÔNG đọc thẳng latestHistory?.createdAt: cùng lý do với initialEnergyKwh
  // ngay dưới — đó là phiên GẦN NHẤT, không phải phiên đang chạy. Lúc phiên mới
  // vừa mở, cache còn là phiên TRƯỚC (đã chốt) nên mốc đếm giờ lấy được là giờ
  // bắt đầu của phiên cũ: đồng hồ ở màn phiên sạc "không reset về 0", vào màn đã
  // hơn 1 phút. Xem utils/sessionEnergySeed.js: resolveSessionStartTime.
  const chargingStartTime = resolveSessionStartTime(latestHistory);
  const displayedChargingStartTime =
    confirmedChargingStartTime || chargingStartTime;
  // KHÔNG đọc thẳng latestHistory: nó là phiên gần nhất, không phải phiên đang
  // chạy. Lúc vừa bấm sạc, isConfirmedSessionPendingSync bật màn phiên sạc lên
  // ngay trong khi cache còn là phiên TRƯỚC (đã chốt) — seed thẳng sẽ lấy tổng
  // năng lượng của phiên cũ. Xem utils/sessionEnergySeed.js.
  const initialEnergyKwh = resolveSessionSeedEnergyKwh(latestHistory);
  const chargingSessionKey = resolveSessionKey(latestHistory);
  const hasFinalizedLatestHistory = Boolean(
    latestHistory?.totalTime || latestHistory?.clientSessionStopped,
  );
  // Suy từ History chứ không từ bike.isCharging: phiên ở trụ nhà dân không
  // gắn xe nào, nên cờ trên bike sẽ mãi mãi false và màn "đang sạc" không bao
  // giờ hiện ra.
  const isChargingSessionActive = Boolean(
    latestHistory && !hasFinalizedLatestHistory,
  );
  const isStopping =
    terminateChargeMutation.isLoading || terminateChargeMutation.isPending;
  // Giữ màn hình ở trạng thái "đang sạc" trong lúc chính nút Dừng sạc còn chờ
  // API — nếu không, một refetch nền không liên quan (vd. latestHistory tự
  // invalidate theo năng lượng realtime ở LatestHistory.js) có thể thấy
  // History đã totalTime (backend ghi DB giữa chừng, trước khi HTTP response
  // trả về) và chuyển màn sớm, trước khi mutation của nút bấm kịp resolve.
  const displayChargingSession =
    !noDeviceConfirmedRef.current &&
    (isConfirmedSessionPendingSync || isChargingSessionActive || isStopping);

  const activeSessionIds = activeSessions.map((session) => String(session?._id || "")).join(":");

  useEffect(() => {
    if (!selectedActiveHistoryId) {
      return;
    }

    const stillActive = activeSessions.some(
      (session) => String(session?._id || "") === String(selectedActiveHistoryId),
    );
    if (!stillActive) {
      setSelectedActiveHistoryId(activeSessions[0]?._id || null);
    }
  }, [selectedActiveHistoryId, activeSessionIds]);

  useEffect(() => {
    if (isConfirmedSessionPendingSync && isChargingSessionActive) {
      setIsConfirmedSessionPendingSync(false);
    }
  }, [isConfirmedSessionPendingSync, isChargingSessionActive]);

  useEffect(() => {
    return () => cancelPendingChargeNotification();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetchBike();
      refetchLatestHistory();
      refetchActiveSessions();
    }, [refetchBike, refetchLatestHistory, refetchActiveSessions]),
  );

  useEffect(() => {
    queryClient.setQueryData(["SCANNED_DEVICE_CODE"], deviceCode);
  }, [deviceCode, queryClient]);

  useEffect(() => {
    const scannedDeviceCode = route?.params?.scannedDeviceCode;
    const scanToken = route?.params?.scanToken;
    const scanAlreadyOwned = route?.params?.scanAlreadyOwned;

    if (!scanToken || !scannedDeviceCode) {
      return;
    }

    setDevices([]);
    setPowerId(null);
    setdeviceCode(String(scannedDeviceCode));
    setIsScanned(true);

    // Show heads-up notification for successful QR scan
    setToastType("success");
    setToastMessage(
      getScanToastMessage({ alreadyOwned: scanAlreadyOwned === true }),
    );
    setToastVisible(true);

    navigation.setParams({
      scannedDeviceCode: undefined,
      scanToken: undefined,
      scanAlreadyOwned: undefined,
    });
  }, [
    route?.params?.scanToken,
    route?.params?.scannedDeviceCode,
    route?.params?.scanAlreadyOwned,
    navigation,
  ]);

  // Quét claim lần đầu xong thì QrScanScreen gửi kèm hai param này. Chuyển sang
  // state rồi xoá param ngay, cùng cách hiệu ứng quét ở trên làm: giữ lại param
  // thì rời màn rồi quay lại là modal thiết lập bật lên lần nữa.
  useEffect(() => {
    const nextSetupDeviceCode = route?.params?.setupDeviceCode;
    const setupToken = route?.params?.setupToken;

    if (!setupToken || !nextSetupDeviceCode) {
      return;
    }

    setSetupDeviceCode(String(nextSetupDeviceCode));
    navigation.setParams({
      setupDeviceCode: undefined,
      setupToken: undefined,
    });
  }, [route?.params?.setupToken, route?.params?.setupDeviceCode, navigation]);

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
    setIsPublicOnboarding(false);
    setDeviceCheck(null);
    noDeviceConfirmedRef.current = false;
    navigation.setParams({
      resetChargeFlowToken: undefined,
      scannedDeviceCode: undefined,
      scanToken: undefined,
      openHomeDevicesToken: undefined,
      scanAlreadyOwned: undefined,
      setupDeviceCode: undefined,
      setupToken: undefined,
      isUpdating: false,
    });
  }, [route?.params?.resetChargeFlowToken, navigation]);



  useEffect(() => {
    if (isSelectedHouseDevice && deviceCode) {
      refetchActiveSessions();
      socket.emit("telemetry_data");
    }
  }, [deviceCode, isSelectedHouseDevice, refetchActiveSessions]);

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
    cancelPendingChargeNotification();
    setIsConfirmedSessionPendingSync(false);
    setConfirmedChargingStartTime(null);
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

          // Ổ có thể nằm ở nhiều path tuỳ shape response — InitiateChargeComponent
          // đọc theo thứ tự: .eChargeDevices / .device / .data / top-level
          // .powerOutlets. Trước đây chỉ patch top-level + .data.powerOutlets nên
          // với shape .eChargeDevices/.device thì patch TRƯỢT -> ổ giữ "Đang có
          // xe sạc" tới khi refetch xong (đúng cái "đợi"). Patch cả các path này
          // để ổ đổi "Sẵn sàng để sử dụng" NGAY.
          const releaseOutletsIn = (node) => {
            if (!node || typeof node !== "object") return node;
            if (!Array.isArray(node.powerOutlets)) return node;
            return {
              ...node,
              powerOutlets: node.powerOutlets.map(releaseOutlet),
            };
          };

          let next = releaseOutletsIn(oldData);
          if (next.eChargeDevices) {
            next = {
              ...next,
              eChargeDevices: releaseOutletsIn(next.eChargeDevices),
            };
          }
          if (next.device) {
            next = { ...next, device: releaseOutletsIn(next.device) };
          }
          if (next.data && typeof next.data === "object") {
            let nextData = releaseOutletsIn(next.data);
            if (nextData.eChargeDevices) {
              nextData = {
                ...nextData,
                eChargeDevices: releaseOutletsIn(nextData.eChargeDevices),
              };
            }
            if (nextData.device) {
              nextData = {
                ...nextData,
                device: releaseOutletsIn(nextData.device),
              };
            }
            next = { ...next, data: nextData };
          }
          return next;
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
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
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
      confirmChargeDeviceCheck().catch(() => {});
      setInitialChargingTelemetry(telemetry || null);
      setConfirmedChargingStartTime(Date.now());
      setIsConfirmedSessionPendingSync(true);
      setDeviceCheck(null);
      queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      refetchBike();
      refetchLatestHistory();
      refetchActiveSessions();
      setToastType("success");
      setToastMessage("Đã phát hiện thiết bị. Bắt đầu phiên sạc!");
      setToastVisible(true);
    };

    const finishWithoutDevice = ({ deferBackendConfirm = false } = {}) => {
      if (finished) return;
      finished = true;
      markChargeDeviceMissing().catch(() => {});
      noDeviceConfirmedRef.current = true;
      setIsConfirmedSessionPendingSync(false);
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
          { historyId: deviceCheck?.historyId || latestHistory?._id },
          {
            onSettled: () => {
              queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
              queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
              queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
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

  // PHẢI khai báo TRƯỚC early return `isLoadingBikeData` bên dưới. Hook nằm sau
  // early return thì lần render đầu (bike data đang tải -> đi vào nhánh return)
  // gọi ít hơn một hook so với lần render sau, và React ném "Rendered more hooks
  // than during the previous render." ngay khi vào màn — màn phiên sạc không mở
  // được. Mọi hook khác của component đều nằm phía trên; giữ nguyên vị trí này.
  const handleOpenActiveSessionFromOutlet = useCallback(
    async (outlet, currentSession) => {
      let session = currentSession;

      if (!session?._id) {
        try {
          const refreshed = await refetchActiveSessions();
          session = pickActiveSession(refreshed?.data || activeSessionsData, {
            deviceCode,
            powerId: outlet?._id,
            powerIndex: outlet?.index,
          });
        } catch {
          session = null;
        }
      }

      if (!session?._id) {
        queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
        Alert.alert(
          "Thông báo",
          "Ổ sạc đang hoạt động nhưng phiên sạc chưa đồng bộ xong. Vui lòng thử lại sau vài giây.",
        );
        return;
      }

      noDeviceConfirmedRef.current = false;
      setDeviceCheck(null);
      setIsConfirmedSessionPendingSync(false);
      setInitialChargingTelemetry(null);
      setConfirmedChargingStartTime(null);
      setSelectedActiveHistoryId(session._id);
      setPowerId(session?.powerId?._id || session?.powerId || outlet?._id || null);

      const sessionDeviceCode = session?.deviceId?.deviceCode || deviceCode;
      if (sessionDeviceCode) {
        setdeviceCode(String(sessionDeviceCode));
        setIsScanned(true);
      }

      socket.emit("telemetry_data");
      queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
    },
    [activeSessionsData, deviceCode, queryClient, refetchActiveSessions],
  );

  if (isLoadingBikeData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  const executeStopCharging = () => {
    beginManualChargeStop();
    terminateChargeMutation.mutate(
      { historyId: latestHistory?._id },
      {
        onSuccess: (data) => {
          syncStoppedChargeState();
          completeManualChargeStop().catch(() => {});

          setToastType("success");
          setToastMessage("Dừng sạc xe thành công!");
          setToastVisible(true);
        },
        onError: (error) => {
          const errorMessage = error?.response?.data?.message || "";

          // Phiên đã được chốt sẵn ở phía backend (watchdog telemetry, pin
          // đầy, rút sạc...) -> không phải lỗi, chỉ cần đồng bộ lại màn hình.
          // Backend từng báo ca này bằng "Xe chưa đang trong quá trình sạc";
          // từ khi trạng thái phiên chuyển từ Bike sang History thì câu đó là
          // "Không tìm thấy thông tin phiên sạc đang hoạt động". Giữ cả hai để
          // app cũ/mới nói chuyện được với backend cũ/mới.
          if (
            errorMessage.includes("Xe chưa đang") ||
            errorMessage.includes("Không tìm thấy thông tin phiên sạc")
          ) {
            syncStoppedChargeState();
            completeManualChargeStop().catch(() => {});
            setToastType("success");
            setToastMessage("Phiên sạc đã được cập nhật.");
            setToastVisible(true);
            return;
          }

          cancelManualChargeStop();
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

  // Đường DUY NHẤT người dùng tự chọn loại trụ (nút ở màn chọn, và hàng "Chọn
  // loại trụ khác" của cả hai component con). Cờ onboarding được chốt ở đây chứ
  // không ở effect tự suy loại trụ sau khi quét QR (:308) — effect đó cũng chạy
  // khi khôi phục phiên sạc dở lúc mở lại app, lúc đó không có gì để hướng dẫn.
  const handleSelectChargeMode = (nextMode) => {
    setIsPublicOnboarding(nextMode === "public" && !bike?.bike);
    setChargeMode(nextMode);
  };

  const isUpdating = route?.params?.isUpdating;
  const requiresPublicBikeRegistration =
    !bike?.bike && chargeMode === "public";
  const showBikeRegistration =
    Boolean(isUpdating) || requiresPublicBikeRegistration;

  // Thanh 3 bước chỉ đi kèm luồng công cộng, và chỉ khi cờ onboarding đang bật.
  // Màn "Cập nhật giấy tờ xe" (isUpdating) mở từ Tài khoản, không thuộc luồng
  // sạc nào -> không hiện.
  const publicChargeStep = resolvePublicChargeStep({
    hasBike: Boolean(bike?.bike),
    deviceCode,
    powerId,
  });
  const showPublicChargeSteps =
    isPublicOnboarding && chargeMode === "public" && !isUpdating;

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
                <Text style={styles.screenTitle}>
                  {getChargeScreenTitle(chargeMode)}
                </Text>
              </View>

              {deviceCheck ? (
                <ChargingDeviceCheck
                  deviceCode={deviceCheck.deviceCode}
                  powerIndex={deviceCheck.powerIndex}
                />
              ) : displayChargingSession ? (
                <>
                  {activeSessions.length > 1 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.activeSessionSelector}
                      contentContainerStyle={styles.activeSessionSelectorContent}
                    >
                      {activeSessions.map((session) => {
                        const isSelected = String(session?._id || "") === String(latestHistory?._id || "");
                        // Trụ nhà dân có tên tự đặt thì hiện tên; trụ công cộng
                        // không có name nên vẫn rơi về mã trụ như trước.
                        const sessionDeviceLabel = getDeviceDisplayName(
                          session?.deviceId,
                        );
                        const label = sessionDeviceLabel
                          ? `${sessionDeviceLabel} / Ổ ${session?.powerId?.index ?? session?.powerIndex ?? "-"}`
                          : `Phiên ${String(session?._id || "").slice(-6)}`;
                        return (
                          <TouchableOpacity
                            key={String(session?._id)}
                            style={[
                              styles.activeSessionChip,
                              isSelected && styles.activeSessionChipSelected,
                            ]}
                            onPress={() => setSelectedActiveHistoryId(session?._id)}
                          >
                            <Text
                              style={[
                                styles.activeSessionChipText,
                                isSelected && styles.activeSessionChipTextSelected,
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                  <ChargingStatusComponent
                    chargingStartTime={displayedChargingStartTime}
                    initialEnergyKwh={initialEnergyKwh}
                    latestHistory={latestHistory}
                    bike={bike?.bike}
                    balance={walletBalance}
                    onStopCharging={handleStopCharging}
                  isStopping={isStopping}
                  initialTelemetry={initialChargingTelemetry}
                  sessionKey={chargingSessionKey}
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
                  setMode={handleSelectChargeMode}
                  stepper={
                    showPublicChargeSteps ? (
                      <ChargeStepper currentStep={publicChargeStep} />
                    ) : null
                  }
                  openHomeDevicesToken={route?.params?.openHomeDevicesToken}
                  activeSessionsData={activeSessionsData}
                  onOpenActiveSession={handleOpenActiveSessionFromOutlet}
                  onScanQrPress={(params) =>
                    navigation.navigate("ScanQR", params)
                  }
                  onRequireDeviceSetup={(code) => setSetupDeviceCode(code)}
                  onChargeStarted={(charge) => {
                    // Bật thành công (gói ack lệnh success=1) -> vào màn TÌM
                    // THIẾT BỊ và chờ gói KIỂM TRA (code, ~4s sau). Backend:
                    //  - code=0 (có thiết bị): đẩy wave_data(power) -> màn tìm
                    //    thiết bị thấy power>0 -> vào phiên sạc + hiển thị W.
                    //  - code=1 (không có): finalize no_device ->
                    //    charge_billing_update -> màn tìm thiết bị thoát về màn
                    //    chọn ổ.
                    // Hướng dẫn lần đầu đã xong nhiệm vụ: người dùng vừa đi
                    // hết ba bước và bật được phiên sạc. Tắt tại đây chứ không
                    // đợi phiên kết thúc — thanh bước không hiện lúc đang sạc
                    // nên không ai thấy nó biến mất, và sạc xong quay lại màn
                    // chọn ổ thì màn hình đã sạch.
                    setIsPublicOnboarding(false);
                    noDeviceConfirmedRef.current = false;
                    setChargeDeviceCheckInProgress(true);
                    setConfirmedChargingStartTime(null);
                    setIsConfirmedSessionPendingSync(false);
                    setInitialChargingTelemetry(null);
                    // Chỉ vá cache khi backend thật sự trả về xe. Phiên nhà
                    // dân trả bike: null — vá bừa isCharging: true sẽ làm thẻ
                    // xe ở màn Tài khoản báo "Đang sạc" cho một chiếc xe đang
                    // đứng yên.
                    if (charge?.bike) {
                      queryClient.setQueryData(["USERS_BIKE"], (current) => ({
                        ...(current || {}),
                        bike: charge.bike,
                      }));
                    }
                    if (charge?.historyId) {
                      setSelectedActiveHistoryId(charge.historyId);
                    }
                    setDeviceCheck({
                      historyId: charge?.historyId,
                      deviceCode: charge?.deviceCode || deviceCode,
                      powerIndex: charge?.powerIndex,
                    });
                    queryClient.invalidateQueries({ queryKey: ["USERS_BIKE"] });
                    queryClient.invalidateQueries({ queryKey: ["latestHistory"] });
                    queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
                  }}
                />
              )}
            </View>
          </ScrollView>
        ) : (
          <BikeRegistration
            isUpdating={isUpdating}
            headerTitle={
              isUpdating ? undefined : getChargeScreenTitle(chargeMode)
            }
            onCancel={() => {
              if (isUpdating) {
                navigation.setParams({ isUpdating: false });
              } else {
                handleSelectChargeMode(null);
              }
            }}
            stepper={
              showPublicChargeSteps ? (
                <ChargeStepper currentStep={publicChargeStep} />
              ) : null
            }
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

      {/* Thiết lập lần đầu cho trụ nhà dân vừa quét. Dùng lại đúng màn Thiết bị
          ở Cài đặt để chỗ đặt tên/địa chỉ/vị trí chỉ có một bản. Modal không
          đóng được cho tới khi có địa chỉ. */}
      <MyDevicesComponent
        myDevicesModalVisible={!!setupDeviceCode}
        setupDeviceCode={setupDeviceCode}
        handleCloseMyDevicesModal={() => setSetupDeviceCode(null)}
        onDeviceUpdated={() => {
          setToastType("success");
          setToastMessage("Đã lưu thông tin trụ sạc!");
          setToastVisible(true);
        }}
      />

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
  activeSessionSelector: {
    marginTop: 16,
    marginBottom: 8,
  },
  activeSessionSelectorContent: {
    gap: 8,
    paddingRight: 8,
  },
  activeSessionChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.secondary,
  },
  activeSessionChipSelected: {
    backgroundColor: Colors.primary,
  },
  activeSessionChipText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  activeSessionChipTextSelected: {
    color: Colors.secondary,
  },
});

export default ChargeScreen;
