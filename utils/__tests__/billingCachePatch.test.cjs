const assert = require("node:assert/strict");
const test = require("node:test");

const {
  patchLatestHistory,
  patchHistoryList,
  isEnergyOnlyUpdate,
} = require("../billingCachePatch");

const HOUSE_SESSION = {
  _id: "h1",
  lastKnownEnergy: 0.5,
  energy: undefined,
  lastKnownPrice: 0,
  billedAmount: 0,
  price: undefined,
};

const listCache = (histories, stats) => ({
  histories,
  monthlyStats: { count: histories.length, totalAmount: 0, totalEnergy: 0, ...stats },
  totalStats: { count: histories.length, totalAmount: 0, totalEnergy: 0, ...stats },
});

// --- Gói energy_update của phiên nhà dân --------------------------------------

test("energy_update vá được năng lượng vào latestHistory", () => {
  const next = patchLatestHistory(HOUSE_SESSION, {
    type: "energy_update",
    energy: 0.7,
    historyId: "h1",
  });

  assert.equal(next.lastKnownEnergy, 0.7);
});

// Gói này không mang price/billedAmount. Nếu applyBillingToHistory gán bừa
// undefined thì giá tiền đang hiển thị sẽ bị xoá trắng giữa phiên.
test("energy_update không đụng tới các trường tiền", () => {
  const session = { ...HOUSE_SESSION, lastKnownPrice: 1200, billedAmount: 1200 };
  const next = patchLatestHistory(session, {
    type: "energy_update",
    energy: 0.7,
    historyId: "h1",
  });

  assert.equal(next.lastKnownPrice, 1200);
  assert.equal(next.billedAmount, 1200);
});

// Chưa isFinal thì `energy` chốt phải giữ nguyên rỗng, nếu không phiên đang
// chạy bị các màn đọc nhầm là đã chốt.
test("chưa isFinal thì không ghi vào trường energy đã chốt", () => {
  const next = patchLatestHistory(HOUSE_SESSION, {
    type: "energy_update",
    energy: 0.7,
    historyId: "h1",
  });

  assert.equal(next.energy, undefined);
  assert.equal(next.totalTime, undefined);
});

test("gói của phiên khác không được vá đè lên phiên đang cache", () => {
  const next = patchLatestHistory(HOUSE_SESSION, {
    type: "energy_update",
    energy: 99,
    historyId: "PHIEN_KHAC",
  });

  assert.equal(next.lastKnownEnergy, 0.5, "phải giữ nguyên");
});

// --- Thống kê tháng ------------------------------------------------------------

// Đây là chỗ lệch nặng nhất trước khi sửa: màn Lịch sử tính
// totalEnergy - activeHistoryEnergy + activeDisplayEnergy, trộn hai số cũ với
// một số mới. Không cộng delta vào totalEnergy thì sai số tích luỹ suốt phiên.
test("energy_update cộng đúng phần chênh vào monthlyStats/totalStats", () => {
  const cache = listCache([HOUSE_SESSION], { totalEnergy: 3 });

  const next = patchHistoryList(cache, {
    type: "energy_update",
    energy: 0.7,
    historyId: "h1",
  });

  // phiên tăng 0.5 -> 0.7, tức +0.2
  assert.equal(next.monthlyStats.totalEnergy, 3.2);
  assert.equal(next.totalStats.totalEnergy, 3.2);
  assert.equal(next.monthlyStats.totalAmount, 0, "nhà dân không phát sinh tiền");
});

test("năng lượng không tăng thì không cộng gì vào thống kê", () => {
  const cache = listCache([HOUSE_SESSION], { totalEnergy: 3 });

  const next = patchHistoryList(cache, {
    type: "energy_update",
    energy: 0.5,
    historyId: "h1",
  });

  assert.equal(next.monthlyStats.totalEnergy, 3);
});

test("chỉ phiên trùng id bị vá, các phiên khác giữ nguyên", () => {
  const other = { _id: "h2", lastKnownEnergy: 1.25 };
  const cache = listCache([HOUSE_SESSION, other], { totalEnergy: 3 });

  const next = patchHistoryList(cache, {
    type: "energy_update",
    energy: 0.7,
    historyId: "h1",
  });

  assert.equal(next.histories[1].lastKnownEnergy, 1.25);
  assert.equal(next.monthlyStats.totalEnergy, 3.2);
});

test("cache rỗng / sai hình dạng thì trả nguyên trạng, không nổ", () => {
  assert.equal(patchHistoryList(undefined, { historyId: "h1" }), undefined);
  assert.deepEqual(patchHistoryList({}, { historyId: "h1" }), {});
  const cache = listCache([HOUSE_SESSION]);
  assert.equal(patchHistoryList(cache, { energy: 1 }), cache, "thiếu historyId");
});

// --- Cửa chặn nhánh ví ---------------------------------------------------------

test("nhận diện đúng gói chỉ mang năng lượng", () => {
  assert.equal(isEnergyOnlyUpdate({ type: "energy_update" }), true);
  assert.equal(isEnergyOnlyUpdate({ type: "charge_debit" }), false);
  assert.equal(isEnergyOnlyUpdate({ type: "auto_stopped" }), false);
  assert.equal(isEnergyOnlyUpdate({}), false);
  assert.equal(isEnergyOnlyUpdate(undefined), false);
});

// --- Không hồi quy luồng trụ công cộng ----------------------------------------

test("gói charge_debit của trụ công cộng vẫn vá cả tiền lẫn năng lượng", () => {
  const session = {
    _id: "h1",
    lastKnownEnergy: 0.5,
    lastKnownPrice: 3000,
    billedAmount: 3000,
  };
  const cache = listCache([session], { totalEnergy: 3, totalAmount: 3000 });

  const next = patchHistoryList(cache, {
    type: "charge_debit",
    energy: 0.7,
    price: 4200,
    billedAmount: 4200,
    balance: 50000,
    historyId: "h1",
  });

  assert.equal(next.histories[0].lastKnownEnergy, 0.7);
  assert.equal(next.histories[0].lastKnownPrice, 4200);
  assert.equal(next.monthlyStats.totalEnergy, 3.2);
  assert.equal(next.monthlyStats.totalAmount, 4200);
});

test("gói isFinal chốt cả price/energy/totalTime", () => {
  const next = patchLatestHistory(
    { _id: "h1", lastKnownEnergy: 0.5 },
    {
      type: "charge_debit",
      isFinal: true,
      energy: 0.8,
      price: 4800,
      totalTime: { hours: 0, minutes: 12 },
      stopReason: "user",
      historyId: "h1",
    },
  );

  assert.equal(next.energy, 0.8);
  assert.equal(next.price, 4800);
  assert.deepEqual(next.totalTime, { hours: 0, minutes: 12 });
  assert.equal(next.stopReason, "user");
});
