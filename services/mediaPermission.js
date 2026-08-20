import * as ImagePicker from "expo-image-picker";
import * as Device from "expo-device";
import permissionStatus from "../utils/permissionStatus";
import { primeAndRequest, PERMISSION_KEYS } from "./permissionPriming";

const { decideNextAction, resolveStatusAfterAsk, resolveStatusWithoutAsking } =
  permissionStatus;

// Đọc và xin quyền camera / thư viện ảnh, trả về cùng bộ trạng thái
// "granted" | "denied" | "blocked" như location.service.js và
// notification.service.js — để mục "Cài đặt quyền" đối xử với cả bốn quyền
// giống hệt nhau.
//
// Spec: docs/superpowers/specs/2026-08-19-permission-settings-screen-design.md
//
// LƯU Ý VỀ CAMERA: đây cùng một quyền hệ điều hành với màn quét QR. expo-camera
// và expo-image-picker đều khai android.permission.CAMERA và đều đọc
// NSCameraUsageDescription, nên cấp ở một chỗ là cả hai chỗ đều thấy `granted`.

// Máy ảo trả "blocked": không có cách nào bật quyền thật trên emulator, nên
// đừng mời người dùng bấm một nút vô nghĩa. Cùng quy ước với
// getNotificationPermissionStatus.
const readStatus = async (getPermissions) => {
  if (!Device.isDevice) {
    return "blocked";
  }

  try {
    return resolveStatusWithoutAsking(await getPermissions());
  } catch (error) {
    return "denied";
  }
};

// Xin quyền, có mồi lời giải thích trước hộp thoại hệ điều hành.
//
// Gọi xuống hệ điều hành kể cả khi trạng thái đọc được là "blocked" — xem luật
// ở đầu utils/locationPermission.js. Bị chặn thật thì OS trả denied ngay và
// không mất gì; `canAskAgain` sai thì đây là lời hỏi cứu được tình huống.
const askFor = async ({ key, getPermissions, requestPermissions }) => {
  if (!Device.isDevice) {
    return "blocked";
  }

  try {
    const current = await getPermissions();

    if (decideNextAction(current) === "granted") return "granted";

    const requested = await primeAndRequest({
      key,
      getStatus: () => current,
      request: requestPermissions,
    });

    return resolveStatusAfterAsk(requested);
  } catch (error) {
    return "denied";
  }
};

export const getCameraPermissionStatus = () =>
  readStatus(ImagePicker.getCameraPermissionsAsync);

export const requestCameraPermission = () =>
  askFor({
    key: PERMISSION_KEYS.CAMERA,
    getPermissions: ImagePicker.getCameraPermissionsAsync,
    requestPermissions: ImagePicker.requestCameraPermissionsAsync,
  });

export const getMediaLibraryPermissionStatus = () =>
  readStatus(ImagePicker.getMediaLibraryPermissionsAsync);

export const requestMediaLibraryPermission = () =>
  askFor({
    key: PERMISSION_KEYS.PHOTO_LIBRARY,
    getPermissions: ImagePicker.getMediaLibraryPermissionsAsync,
    requestPermissions: ImagePicker.requestMediaLibraryPermissionsAsync,
  });
