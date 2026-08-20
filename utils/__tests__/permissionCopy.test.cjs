const assert = require("node:assert/strict");
const test = require("node:test");

const {
  PERMISSION_KEYS,
  resolvePermissionCopy,
  shouldPrime,
} = require("../permissionCopy");

const INFO_PLIST = {
  NSLocationWhenInUseUsageDescription: "Lý do vị trí khai với Apple.",
  NSCameraUsageDescription: "Lý do camera khai với Apple.",
  NSPhotoLibraryUsageDescription: "Lý do thư viện ảnh khai với Apple.",
  NSUserNotificationUsageDescription: "Lý do thông báo khai với Apple.",
};

// Bốn khoá, không phải năm. Camera dùng chung cho quét QR, chụp giấy tờ xe và
// ảnh phản ánh — expo-camera lẫn expo-image-picker cùng khai
// android.permission.CAMERA nên hệ điều hành chỉ hỏi một lần.
test("đúng bốn quyền, không tách camera thành hai", () => {
  assert.deepEqual(Object.values(PERMISSION_KEYS).sort(), [
    "camera",
    "location",
    "notifications",
    "photoLibrary",
  ]);
});

test("lấy đúng chuỗi infoPlist cho từng quyền", () => {
  assert.equal(
    resolvePermissionCopy(PERMISSION_KEYS.LOCATION, INFO_PLIST).body,
    "Lý do vị trí khai với Apple.",
  );
  assert.equal(
    resolvePermissionCopy(PERMISSION_KEYS.CAMERA, INFO_PLIST).body,
    "Lý do camera khai với Apple.",
  );
  assert.equal(
    resolvePermissionCopy(PERMISSION_KEYS.PHOTO_LIBRARY, INFO_PLIST).body,
    "Lý do thư viện ảnh khai với Apple.",
  );
  assert.equal(
    resolvePermissionCopy(PERMISSION_KEYS.NOTIFICATIONS, INFO_PLIST).body,
    "Lý do thông báo khai với Apple.",
  );
});

// infoPlist chỉ có phần mô tả, không có tiêu đề — tiêu đề phải tự viết.
test("mọi quyền đều có tiêu đề riêng, không rỗng", () => {
  for (const key of Object.values(PERMISSION_KEYS)) {
    const copy = resolvePermissionCopy(key, INFO_PLIST);
    assert.ok(copy.title.length > 0, `thiếu tiêu đề cho ${key}`);
  }
});

// Android không đọc infoPlist. Nếu vì lý do gì đó config không tới được thì vẫn
// phải có chữ tiếng Việt để hiện, không được ra popup trống.
test("thiếu infoPlist thì rơi về bảng dự phòng, không ra chuỗi rỗng", () => {
  for (const key of Object.values(PERMISSION_KEYS)) {
    for (const plist of [undefined, null, {}]) {
      const copy = resolvePermissionCopy(key, plist);
      assert.ok(copy.body.length > 0, `thiếu body dự phòng cho ${key}`);
      assert.ok(copy.title.length > 0, `thiếu title dự phòng cho ${key}`);
    }
  }
});

test("khoá thiếu riêng lẻ chỉ ảnh hưởng đúng quyền đó", () => {
  const partial = { NSCameraUsageDescription: "Chỉ có camera." };

  assert.equal(
    resolvePermissionCopy(PERMISSION_KEYS.CAMERA, partial).body,
    "Chỉ có camera.",
  );
  assert.ok(
    resolvePermissionCopy(PERMISSION_KEYS.LOCATION, partial).body.length > 0,
  );
  assert.notEqual(
    resolvePermissionCopy(PERMISSION_KEYS.LOCATION, partial).body,
    "Chỉ có camera.",
  );
});

// app.json là file người sửa tay. Một giá trị không phải chuỗi lọt vào đó không
// được phép làm popup hiện "[object Object]".
test("giá trị infoPlist không phải chuỗi bị bỏ qua", () => {
  const broken = {
    NSCameraUsageDescription: { vi: "sai kiểu" },
    NSLocationWhenInUseUsageDescription: 123,
    NSPhotoLibraryUsageDescription: "   ",
  };

  const camera = resolvePermissionCopy(PERMISSION_KEYS.CAMERA, broken);
  const location = resolvePermissionCopy(PERMISSION_KEYS.LOCATION, broken);
  const photo = resolvePermissionCopy(PERMISSION_KEYS.PHOTO_LIBRARY, broken);

  assert.equal(typeof camera.body, "string");
  assert.ok(camera.body.length > 0);
  assert.equal(typeof location.body, "string");
  assert.ok(location.body.length > 0);
  // Chuỗi toàn khoảng trắng cũng coi như thiếu.
  assert.ok(photo.body.trim().length > 0);
});

test("khoá lạ trả về null để chỗ gọi tự quyết, không bịa nội dung", () => {
  assert.equal(resolvePermissionCopy("bluetooth", INFO_PLIST), null);
  assert.equal(resolvePermissionCopy(undefined, INFO_PLIST), null);
  assert.equal(resolvePermissionCopy(null, INFO_PLIST), null);
  assert.equal(resolvePermissionCopy("", INFO_PLIST), null);
});

// --- shouldPrime ----------------------------------------------------------

// CHỈ dùng để quyết định có hiện popup mồi hay không. Tuyệt đối không được dùng
// để bỏ qua lời gọi request() — xem đầu utils/locationPermission.js.
test("đã cấp quyền thì không mồi", () => {
  assert.equal(shouldPrime({ status: "granted", granted: true }), false);
});

test("chưa cấp thì mồi, kể cả khi canAskAgain là false", () => {
  assert.equal(shouldPrime({ status: "undetermined", granted: false }), true);
  assert.equal(
    shouldPrime({ status: "denied", granted: false, canAskAgain: false }),
    true,
  );
});

test("đọc trạng thái hỏng thì vẫn mồi, không im lặng bỏ qua", () => {
  assert.equal(shouldPrime(undefined), true);
  assert.equal(shouldPrime(null), true);
  assert.equal(shouldPrime({}), true);
});

test("granted phải đúng boolean true, không nhận truthy khác", () => {
  assert.equal(shouldPrime({ granted: "true" }), true);
  assert.equal(shouldPrime({ granted: 1 }), true);
});
