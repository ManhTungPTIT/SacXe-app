import { Alert } from "react-native";
import Constants from "expo-constants";
import permissionCopy from "../utils/permissionCopy";

const { PERMISSION_KEYS, resolvePermissionCopy, shouldPrime } = permissionCopy;

// Popup mồi giải thích lý do, hiện TRƯỚC hộp thoại xin quyền của hệ điều hành.
// Spec: docs/superpowers/specs/2026-08-19-permission-priming-design.md
//
// VÌ SAO DÙNG Alert.alert CHỨ KHÔNG PHẢI <Modal> TỰ VẼ: hai điểm gọi nằm bên
// trong một <Modal> đang mở (MyDevicesComponent, và banner quyền ở
// NotificationComponent). Trên iOS, mở <Modal> đè lên <Modal> là chỗ hay lỗi.
// Alert do hệ điều hành vẽ nên luôn nằm trên cùng. Codebase cũng đã dùng
// Alert.alert cho đúng việc này ở QrScanScreen.js, HomeScreen.js,
// BikeRegistration.js.
//
// Muốn đổi sang Modal thương hiệu sau này thì chỉ sửa showPrimer bên dưới —
// không điểm gọi nào phải đổi, vì tất cả đều nấp sau primeAndRequest.

// infoPlist nằm trong config nhúng của bundle nên Android cũng đọc được. Đây là
// đúng chuỗi đã khai với Apple trong app.json, không phải bản chép tay.
const getInfoPlist = () => Constants.expoConfig?.ios?.infoPlist;

// `cancelable: false` KHÔNG phải trang trí. Popup chỉ có một nút; nếu nút back
// của Android đóng được hộp thoại thì Promise dưới đây không bao giờ resolve và
// luồng gọi đứng im vĩnh viễn. QrScanScreen.js:271 dùng cờ này vì cùng lý do.
const showPrimer = ({ title, body }) =>
  new Promise((resolve) => {
    Alert.alert(title, body, [{ text: "Tiếp tục", onPress: () => resolve() }], {
      cancelable: false,
    });
  });

// Hiện lời giải thích rồi mới gọi xuống hệ điều hành.
//
//   key       - một trong PERMISSION_KEYS
//   getStatus - đọc quyền hiện tại, chỉ để biết CÓ CẦN MỒI KHÔNG
//   request   - lời gọi xin quyền thật, trả về nguyên vẹn cho chỗ gọi
//
// Hành vi cũ giữ nguyên: `request` luôn được gọi và kết quả trả thẳng ra. Thứ
// duy nhất thêm vào là một Alert chèn phía trước khi quyền chưa được cấp.
//
// `getStatus` KHÔNG được dùng để chặn `request` — xem ghi chú shouldPrime trong
// utils/permissionCopy.js.
export const primeAndRequest = async ({ key, getStatus, request }) => {
  let current = null;

  try {
    current = await getStatus();
  } catch (error) {
    // Không đọc được trạng thái thì coi như chưa cấp và vẫn mồi. Thà hiện thừa
    // một lời giải thích còn hơn để hộp thoại hệ thống bật ra không ngữ cảnh.
    current = null;
  }

  if (shouldPrime(current)) {
    const copy = resolvePermissionCopy(key, getInfoPlist());

    // Khoá lạ thì không bịa nội dung, đi thẳng xuống hệ điều hành như trước.
    if (copy) {
      await showPrimer(copy);
    }
  }

  return request();
};

export { PERMISSION_KEYS };
