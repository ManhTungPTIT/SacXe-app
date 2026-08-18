const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DEFAULT_CHARGE_TITLE,
  HOME_CHARGE_TITLE,
  PUBLIC_CHARGE_TITLE,
  getChargeScreenTitle,
} = require("../chargeScreenTitle");

test("tiêu đề bám luồng trụ gia đình", () => {
  assert.equal(getChargeScreenTitle("home"), HOME_CHARGE_TITLE);
});

test("tiêu đề bám luồng trụ công cộng", () => {
  assert.equal(getChargeScreenTitle("public"), PUBLIC_CHARGE_TITLE);
});

test("chưa chọn loại trụ thì giữ tiêu đề chung", () => {
  assert.equal(getChargeScreenTitle(null), DEFAULT_CHARGE_TITLE);
  assert.equal(getChargeScreenTitle(undefined), DEFAULT_CHARGE_TITLE);
  assert.equal(getChargeScreenTitle(), DEFAULT_CHARGE_TITLE);
});

test("giá trị lạ không làm vỡ tiêu đề", () => {
  assert.equal(getChargeScreenTitle(""), DEFAULT_CHARGE_TITLE);
  assert.equal(getChargeScreenTitle("Home"), DEFAULT_CHARGE_TITLE);
  assert.equal(getChargeScreenTitle(0), DEFAULT_CHARGE_TITLE);
  assert.equal(getChargeScreenTitle({}), DEFAULT_CHARGE_TITLE);
});

test("ba tiêu đề là ba chuỗi khác nhau", () => {
  const titles = new Set([
    DEFAULT_CHARGE_TITLE,
    HOME_CHARGE_TITLE,
    PUBLIC_CHARGE_TITLE,
  ]);
  assert.equal(titles.size, 3);
});
