const assert = require("node:assert/strict");
const test = require("node:test");

const { buildPermissionRows } = require("../permissionSettingsRows");

const INFO_PLIST = {
  NSLocationWhenInUseUsageDescription: "Lý do vị trí.",
  NSCameraUsageDescription: "Lý do camera.",
  NSPhotoLibraryUsageDescription: "Lý do thư viện ảnh.",
  NSUserNotificationUsageDescription: "Lý do thông báo.",
};

const ALL_GRANTED = {
  location: "granted",
  camera: "granted",
  photoLibrary: "granted",
  notifications: "granted",
};

// Thứ tự cố định, không phụ thuộc thứ tự khoá trong `statuses`. Object key order
// trong JS đủ ổn định để dễ tưởng là an toàn, nhưng danh sách người dùng nhìn
// thấy không nên phụ thuộc vào chuyện đó.
test("luôn đủ 4 dòng, đúng thứ tự, bất kể thứ tự khoá đưa vào", () => {
  const rows = buildPermissionRows({
    statuses: {
      notifications: "granted",
      photoLibrary: "granted",
      camera: "granted",
      location: "granted",
    },
    infoPlist: INFO_PLIST,
  });

  assert.deepEqual(
    rows.map((row) => row.key),
    ["location", "camera", "photoLibrary", "notifications"],
  );
});

test("đã cấp -> công tắc bật, gạt ra ý định thu hồi", () => {
  const rows = buildPermissionRows({
    statuses: ALL_GRANTED,
    infoPlist: INFO_PLIST,
  });

  for (const row of rows) {
    assert.equal(row.status, "granted");
    assert.equal(row.enabled, true);
    assert.equal(row.intent, "revoke");
  }
});

test("chưa cấp -> công tắc tắt, gạt ra ý định hỏi quyền", () => {
  const [location] = buildPermissionRows({
    statuses: { ...ALL_GRANTED, location: "denied" },
    infoPlist: INFO_PLIST,
  });

  assert.equal(location.status, "denied");
  assert.equal(location.enabled, false);
  assert.equal(location.intent, "ask");
});

// Bị chặn đi ĐÚNG một đường với chưa cấp: gạt bật là hiện popup giải thích của
// app rồi gọi xuống hệ điều hành, giống hệt lần hỏi đầu tiên.
//
// Vì sao vẫn hỏi dù biết có thể bị chặn: `canAskAgain` không đáng tin trên
// Android (xem đầu utils/locationPermission.js). Đọc ra "blocked" chưa chắc đã
// bị chặn thật — bỏ qua lời hỏi là tự tay đóng cánh cửa còn mở.
test("bị chặn -> giống hệt chưa cấp, không có đường riêng", () => {
  const rows = buildPermissionRows({
    statuses: { ...ALL_GRANTED, notifications: "blocked" },
    infoPlist: INFO_PLIST,
  });
  const notifications = rows.find((row) => row.key === "notifications");

  assert.equal(notifications.status, "blocked");
  assert.equal(notifications.enabled, false);
  assert.equal(notifications.intent, "ask");
});

test("mọi dòng chưa được cấp đều dùng intent 'ask'", () => {
  const rows = buildPermissionRows({
    statuses: {
      location: "denied",
      camera: "blocked",
      photoLibrary: "denied",
      notifications: "blocked",
    },
    infoPlist: INFO_PLIST,
  });

  for (const row of rows) {
    assert.equal(row.intent, "ask", `${row.key} không dùng 'ask'`);
    assert.equal(row.enabled, false, `${row.key} không tắt`);
  }
});

// Tiêu đề ngắn là của riêng hàng có công tắc. Tiêu đề dài trong permissionCopy
// ("Cho phép truy cập vị trí") là câu mở đầu popup mồi — đọc lên cạnh một công
// tắc thì vừa thừa vừa dài quá một dòng.
test("tiêu đề là tên ngắn, không phải câu mở đầu popup mồi", () => {
  const rows = buildPermissionRows({
    statuses: ALL_GRANTED,
    infoPlist: INFO_PLIST,
  });

  assert.deepEqual(
    rows.map((row) => row.title),
    ["Vị trí", "Camera", "Thư viện ảnh", "Thông báo"],
  );
});

test("nội dung mô tả vẫn lấy từ infoPlist", () => {
  const rows = buildPermissionRows({
    statuses: ALL_GRANTED,
    infoPlist: INFO_PLIST,
  });

  assert.equal(rows[0].body, "Lý do vị trí.");
  assert.equal(rows[1].body, "Lý do camera.");
  assert.equal(rows[2].body, "Lý do thư viện ảnh.");
  assert.equal(rows[3].body, "Lý do thông báo.");
});

// Đọc trạng thái hỏng thì cho người dùng một lối ra, đừng để lại một dòng chết
// không gạt được gì.
test("khoá thiếu hoặc trạng thái lạ rơi về 'chưa cấp', vẫn gạt được", () => {
  const rows = buildPermissionRows({
    statuses: { location: "granted", camera: "trạng thái lạ" },
    infoPlist: INFO_PLIST,
  });

  const camera = rows.find((row) => row.key === "camera");
  const photo = rows.find((row) => row.key === "photoLibrary");
  const notifications = rows.find((row) => row.key === "notifications");

  for (const row of [camera, photo, notifications]) {
    assert.equal(row.status, "denied", `sai trạng thái cho ${row.key}`);
    assert.equal(row.enabled, false);
    assert.equal(row.intent, "ask");
  }
});

test("không có statuses thì vẫn dựng đủ 4 dòng, không nổ", () => {
  for (const input of [{}, { statuses: null }, { statuses: undefined }]) {
    const rows = buildPermissionRows(input);
    assert.equal(rows.length, 4);
    for (const row of rows) {
      assert.equal(row.intent, "ask");
      assert.ok(row.body.length > 0, `thiếu body dự phòng: ${row.key}`);
      assert.ok(row.title.length > 0, `thiếu tiêu đề: ${row.key}`);
    }
  }
});

test("gọi không tham số cũng không nổ", () => {
  assert.equal(buildPermissionRows().length, 4);
});
