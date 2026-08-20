// Dựng danh sách hiển thị cho mục "Cài đặt quyền" trong màn Tài khoản. Thuần
// JavaScript, không chạm React Native, để test được bằng `node --test`.
//
// Spec: docs/superpowers/specs/2026-08-20-permission-toggle-switches-design.md
//
// Component chỉ việc vẽ ra thứ hàm này trả về: mọi luật "trạng thái nào thì
// công tắc bật hay tắt, gạt ra thì làm gì" nằm gọn ở đây và test được mà không
// cần dựng React.

const permissionCopy = require("./permissionCopy");

const { PERMISSION_KEYS, resolvePermissionCopy } = permissionCopy;

// Thứ tự cố định, không lấy theo thứ tự khoá của `statuses`. Danh sách người
// dùng nhìn thấy không nên phụ thuộc vào thứ tự chèn khoá vào một object.
//
// Xếp theo lúc người dùng gặp quyền đó trong app: mở app thấy bản đồ (vị trí),
// quét trụ (camera), đăng ký giấy tờ xe (thư viện ảnh), rồi mới tới thông báo.
const ROW_ORDER = [
  PERMISSION_KEYS.LOCATION,
  PERMISSION_KEYS.CAMERA,
  PERMISSION_KEYS.PHOTO_LIBRARY,
  PERMISSION_KEYS.NOTIFICATIONS,
];

// Tên ngắn cho hàng có công tắc. Không dùng `title` của permissionCopy vì đó là
// câu mở đầu popup mồi ("Cho phép truy cập vị trí") — đọc lên cạnh một công tắc
// thì vừa thừa vừa dài quá một dòng. Hai chỗ, hai mục đích, đừng gộp.
const SHORT_TITLES = {
  [PERMISSION_KEYS.LOCATION]: "Vị trí",
  [PERMISSION_KEYS.CAMERA]: "Camera",
  [PERMISSION_KEYS.PHOTO_LIBRARY]: "Thư viện ảnh",
  [PERMISSION_KEYS.NOTIFICATIONS]: "Thông báo",
};

// `enabled` là vị trí công tắc, lấy thẳng từ trạng thái thật của hệ điều hành —
// app không giữ một bản sao nào để lệch.
//
// `intent` là thứ component dùng để chọn việc phải làm khi người dùng gạt:
//   "ask"    - hiện popup giải thích của app rồi gọi xuống hệ điều hành
//   "revoke" - mời sang trang Cài đặt của máy
//
// Vì sao "revoke" không tự tắt được: iOS và Android không có API cho app thu
// hồi quyền của chính nó. Có đường xin, không có đường trả. Công tắc vì thế
// đứng yên ở vị trí bật cho tới khi người dùng thật sự tắt bên Cài đặt, và
// AppState listener trong component đọc lại được điều đó.
//
// Vì sao "blocked" cũng là "ask" chứ không nhảy thẳng sang Cài đặt:
// `canAskAgain` không đáng tin trên Android — nó là false cả khi quyền chưa
// từng được hỏi, và cờ didAsk của Expo bị Google Auto Backup mang từ bản cài
// trước sang (xem đầu utils/locationPermission.js). Đọc ra "blocked" chưa chắc
// đã bị chặn thật; bỏ qua lời hỏi là tự tay đóng một cánh cửa có thể vẫn mở.
//
// Bị chặn thật thì hệ điều hành trả về ngay mà không vẽ gì — lúc đó component
// mới mời vào Cài đặt, như một bước SAU chứ không phải thay cho lời hỏi.
const SWITCH_PRESENTATION = {
  granted: { enabled: true, intent: "revoke" },
  denied: { enabled: false, intent: "ask" },
  blocked: { enabled: false, intent: "ask" },
};

// Trạng thái lạ hoặc thiếu rơi về "denied" chứ không rơi về "granted": để lại
// một công tắc gạt được còn hơn một dòng chết mà người dùng không hiểu vì sao
// tính năng không chạy.
const normalizeStatus = (status) =>
  SWITCH_PRESENTATION[status] ? status : "denied";

const buildPermissionRows = ({ statuses, infoPlist } = {}) =>
  ROW_ORDER.map((key) => {
    const status = normalizeStatus(statuses?.[key]);
    const copy = resolvePermissionCopy(key, infoPlist);

    return {
      key,
      title: SHORT_TITLES[key],
      body: copy.body,
      status,
      ...SWITCH_PRESENTATION[status],
    };
  });

module.exports = {
  ROW_ORDER,
  SHORT_TITLES,
  SWITCH_PRESENTATION,
  buildPermissionRows,
};
