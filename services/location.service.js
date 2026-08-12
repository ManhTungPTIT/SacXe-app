import * as Location from "expo-location";
import positionRequest from "../utils/positionRequest";
import locationPermission from "../utils/locationPermission";

const { createPositionRequest } = positionRequest;
const {
  decideNextAction,
  resolveStatusAfterAsk,
  resolveStatusWithoutAsking,
} = locationPermission;

// Hạn chờ cho lời gọi định vị "tươi". Trụ sạc xe máy điện ở chung cư thường nằm
// dưới hầm gửi xe, nơi getCurrentPositionAsync có thể chờ rất lâu hoặc không
// bao giờ trả về — không có hạn chờ thì màn quét QR đứng hình.
//
// 15 giây chứ không phải 8: ở hầm gửi xe lần bắt fix đầu tiên thường vượt 8
// giây, và người dùng không mất trọn 15 giây đó vì màn quét đã gọi
// prefetchCurrentPosition() từ lúc mở camera.
const DEFAULT_TIMEOUT_MS = 15000;

// Vị trí hệ thống đã lưu còn dùng được trong khoảng này. Một phút đủ ngắn để
// người dùng không thể đi xa khỏi chỗ đo, đủ dài để tận dụng lần định vị mà
// HomeScreen đã thực hiện lúc mở app.
const LAST_KNOWN_MAX_AGE_MS = 60000;

// Vị trí đã lưu đạt mức này thì dùng luôn, không bắt người dùng chờ GPS bắt
// lại. Đây là ca phổ biến nên nó quyết định cảm giác nhanh/chậm của tính năng.
const GOOD_ENOUGH_ACCURACY_M = 50;

const normalizePosition = (position) => {
  const coords = position?.coords;

  if (!coords) {
    return null;
  }

  const { latitude, longitude, accuracy } = coords;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
  };
};

// accuracy null nghĩa là máy không báo sai số. Coi bản đó kém hơn bản có số đo,
// vì phía sau còn dùng accuracy để nới bán kính cho phép.
const pickMoreAccurate = (a, b) => {
  if (!a) return b;
  if (!b) return a;
  if (a.accuracy === null) return b;
  if (b.accuracy === null) return a;

  return b.accuracy < a.accuracy ? b : a;
};

const withTimeout = (promise, timeoutMs) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });

// Chỉ ĐỌC trạng thái quyền, không bao giờ hiện hộp thoại. Dùng cho màn quét QR
// (spec 2026-08-05) và cho các chỗ chỉ cần biết có quyền hay chưa.
export const getLocationPermissionStatus = async () => {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    return resolveStatusWithoutAsking(current);
  } catch (error) {
    return "denied";
  }
};

// Xin quyền nếu chưa có. Xem utils/locationPermission.js để biết vì sao KHÔNG
// được dùng canAskAgain để bỏ qua lời hỏi — đó chính là nguyên nhân app không
// hiện popup xin quyền vị trí trên máy vừa cài mới.
export const requestLocationPermissionIfNeeded = async () => {
  try {
    const current = await Location.getForegroundPermissionsAsync();

    if (decideNextAction(current) === "granted") return "granted";

    const requested = await Location.requestForegroundPermissionsAsync();
    return resolveStatusAfterAsk(requested);
  } catch (error) {
    return "denied";
  }
};

// Lời gọi định vị dùng chung cho một phiên quét QR. Xem utils/positionRequest.js
// để biết vì sao phải dùng chung thay vì mỗi lần hỏi lại một lời gọi mới.
const scanPositionRequest = createPositionRequest({
  getPosition: () =>
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).then(normalizePosition),
});

// Khởi động định vị sớm mà không chờ kết quả. Gọi lúc mở màn quét, để tới lúc
// quét được mã QR thì máy đã bắt fix xong hoặc gần xong.
//
// Chỉ đọc trạng thái quyền, KHÔNG xin quyền: theo spec 2026-08-05, màn quét
// không được hiện popup xin quyền vị trí.
export const prefetchCurrentPosition = async () => {
  const status = await getLocationPermissionStatus();
  if (status !== "granted") return;

  scanPositionRequest.prefetch();
};

// Quên toạ độ đã đo của phiên quét. Gọi khi rời màn quét để lần quét sau — có
// thể ở trụ khác — đo lại từ đầu.
export const resetScanPosition = () => {
  scanPositionRequest.reset();
};

// Trả { status, position, reason }. `reason` chỉ có nghĩa khi position là null:
//   "permission"       — chưa được cấp quyền vị trí
//   "servicesDisabled" — người dùng đang tắt định vị của máy
//   "timeout"          — có quyền, định vị đang bật, nhưng chưa bắt được fix
export const getCurrentPositionIfPermitted = async ({
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) => {
  const status = await getLocationPermissionStatus();
  if (status !== "granted") {
    return { status, position: null, reason: "permission" };
  }

  const current = await scanPositionRequest.resolve({ timeoutMs });

  if (current) {
    return { status, position: current, reason: null };
  }

  // Chỉ hỏi khi đã thất bại: phân biệt "máy tắt định vị" (người dùng bật lại là
  // xong) với "đang ở chỗ sóng yếu" (chỉ có thể chờ thêm). Hỏi ở nhánh thành
  // công chỉ tổ thêm một lời gọi hệ thống vào ca phổ biến.
  const servicesEnabled = await Location.hasServicesEnabledAsync().catch(
    () => true,
  );

  return {
    status,
    position: null,
    reason: servicesEnabled ? "timeout" : "servicesDisabled",
  };
};
// Trả { latitude, longitude, accuracy } hoặc null nếu không lấy được vị trí nào
// trong hạn chờ. Gọi hai nguồn song song và lấy bản chính xác hơn.
export const resolveCurrentPosition = async ({
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) => {
  // Bắt lỗi ngay tại chỗ để lời gọi thất bại SAU khi đã hết hạn chờ không trở
  // thành unhandled rejection.
  const lastKnownPromise = Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_MAX_AGE_MS,
  })
    .then(normalizePosition)
    .catch(() => null);

  const currentPromise = Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  })
    .then(normalizePosition)
    .catch(() => null);

  const lastKnown = await lastKnownPromise;

  if (
    lastKnown &&
    lastKnown.accuracy !== null &&
    lastKnown.accuracy <= GOOD_ENOUGH_ACCURACY_M
  ) {
    return lastKnown;
  }

  const current = await withTimeout(currentPromise, timeoutMs);

  return pickMoreAccurate(lastKnown, current);
};
