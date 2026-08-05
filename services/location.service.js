import * as Location from "expo-location";

// Hạn chờ cho lời gọi định vị "tươi". Trụ sạc xe máy điện ở chung cư thường nằm
// dưới hầm gửi xe, nơi getCurrentPositionAsync có thể chờ rất lâu hoặc không
// bao giờ trả về — không có hạn chờ thì màn quét QR đứng hình.
const DEFAULT_TIMEOUT_MS = 8000;

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

export const getLocationPermissionStatus = async () => {
  try {
    const current = await Location.getForegroundPermissionsAsync();

    if (current.granted) return "granted";
    return current.canAskAgain === false ? "blocked" : "denied";
  } catch (error) {
    return "denied";
  }
};

export const requestLocationPermissionIfNeeded = async () => {
  try {
    const current = await Location.getForegroundPermissionsAsync();

    if (current.granted) return "granted";
    if (current.canAskAgain === false) return "blocked";

    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.granted) return "granted";
    return requested.canAskAgain === false ? "blocked" : "denied";
  } catch (error) {
    return "denied";
  }
};

export const getCurrentPositionIfPermitted = async ({
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) => {
  const status = await getLocationPermissionStatus();
  if (status !== "granted") return { status, position: null };

  const current = await withTimeout(
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).then(normalizePosition),
    timeoutMs,
  );

  return { status, position: current };
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
