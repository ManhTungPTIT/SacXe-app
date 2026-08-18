const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveDeviceQueryKey,
} = require("../chargeDeviceStatusInvalidation");

// Sự kiện charge_device_status nói về MỘT ổ của MỘT trụ. Trước đây nó gỡ cache
// theo tiền tố ["E_CHARGE_DEVICE"], mà react-query khớp tiền tố — nên nó kéo
// theo cả ["E_CHARGE_DEVICE", "ALL", lat, lng] là danh sách trụ của bản đồ
// Trang chủ. Xem docs bên dưới và comment trong RootNavigator.

test("có mã trụ -> chỉ gỡ cache của đúng trụ đó", () => {
  assert.deepEqual(resolveDeviceQueryKey({ deviceCode: "plug_94FB9C" }), [
    "E_CHARGE_DEVICE",
    "plug_94FB9C",
  ]);
});

// Payload đi qua nhiều tầng (MQTT -> socket) nên tên trường không nhất quán;
// phần còn lại của RootNavigator cũng đọc theo đúng thứ tự này.
test("đọc được cả deviceId và device_id", () => {
  assert.deepEqual(resolveDeviceQueryKey({ deviceId: "plug_A" }), [
    "E_CHARGE_DEVICE",
    "plug_A",
  ]);
  assert.deepEqual(resolveDeviceQueryKey({ device_id: "plug_B" }), [
    "E_CHARGE_DEVICE",
    "plug_B",
  ]);
});

test("mã trụ được cắt khoảng trắng", () => {
  assert.deepEqual(resolveDeviceQueryKey({ deviceCode: "  plug_C  " }), [
    "E_CHARGE_DEVICE",
    "plug_C",
  ]);
});

// Thiếu mã trụ thì KHÔNG được im lặng bỏ qua: lùi về hành vi cũ (gỡ cả tiền tố)
// để không nuốt mất một cập nhật thật. Thà chấp nhận một lần nạp lại thừa còn
// hơn để ổ hiện sai trạng thái.
test("thiếu mã trụ -> lùi về gỡ cả tiền tố như trước", () => {
  assert.deepEqual(resolveDeviceQueryKey({}), ["E_CHARGE_DEVICE"]);
  assert.deepEqual(resolveDeviceQueryKey(), ["E_CHARGE_DEVICE"]);
  assert.deepEqual(resolveDeviceQueryKey({ deviceCode: "   " }), [
    "E_CHARGE_DEVICE",
  ]);
  assert.deepEqual(resolveDeviceQueryKey({ deviceCode: null }), [
    "E_CHARGE_DEVICE",
  ]);
});
