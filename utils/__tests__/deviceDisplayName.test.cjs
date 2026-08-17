const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getDeviceDisplayName,
  hasCustomDeviceName,
} = require("../deviceDisplayName");

test("tên tự đặt được ưu tiên hơn mã trụ", () => {
  assert.equal(
    getDeviceDisplayName({ deviceCode: "plug_94FB9C", name: "Trụ sân sau" }),
    "Trụ sân sau",
  );
});

test("chưa đặt tên thì hiện mã trụ", () => {
  assert.equal(getDeviceDisplayName({ deviceCode: "plug_94FB9C" }), "plug_94FB9C");
});

// Tên toàn khoảng trắng lọt qua là danh sách trụ hiện một dòng trống, người
// dùng không còn cách nào nhận ra trụ nào là trụ nào.
test("tên toàn khoảng trắng bị coi như chưa đặt", () => {
  assert.equal(
    getDeviceDisplayName({ deviceCode: "plug_94FB9C", name: "   " }),
    "plug_94FB9C",
  );
});

test("tên không phải chuỗi bị bỏ qua thay vì hiện ra", () => {
  assert.equal(
    getDeviceDisplayName({ deviceCode: "plug_94FB9C", name: 123 }),
    "plug_94FB9C",
  );
});

test("thiếu cả tên lẫn mã trụ trả chuỗi rỗng, không trả undefined", () => {
  assert.equal(getDeviceDisplayName(null), "");
  assert.equal(getDeviceDisplayName({}), "");
});

test("hasCustomDeviceName phân biệt được tên tự đặt với mã trụ", () => {
  assert.equal(
    hasCustomDeviceName({ deviceCode: "plug_94FB9C", name: "Trụ sân sau" }),
    true,
  );
  assert.equal(hasCustomDeviceName({ deviceCode: "plug_94FB9C" }), false);
  assert.equal(
    hasCustomDeviceName({ deviceCode: "plug_94FB9C", name: "plug_94FB9C" }),
    false,
  );
});
