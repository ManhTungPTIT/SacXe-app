const assert = require("node:assert/strict");
const test = require("node:test");

const { createPositionRequest } = require("../positionRequest");

const POSITION = { latitude: 21.0285, longitude: 105.8542, accuracy: 12 };

// Đồng hồ giả: mọi ca đều điều khiển thời gian bằng tay, không có test nào phải
// chờ thật.
const createClock = () => {
  let current = 0;
  return {
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
  };
};

// Lời gọi định vị giả mà test tự quyết định lúc nào xong. Đếm số lần được gọi
// để chứng minh phần dùng chung lời gọi hoạt động.
const createDeferredGetter = () => {
  const calls = [];

  const getPosition = () => {
    let settle;
    const promise = new Promise((resolve) => {
      settle = resolve;
    });
    calls.push({ settle });
    return promise;
  };

  return {
    getPosition,
    get callCount() {
      return calls.length;
    },
    settle: (index, value) => {
      calls[index].settle(value);
      // Nhường một nhịp micro-task để chuỗi .then bên trong module chạy xong.
      return Promise.resolve();
    },
  };
};

test("resolve trả về vị trí khi lời gọi kịp trong hạn chờ", async () => {
  const getter = createDeferredGetter();
  const request = createPositionRequest({
    getPosition: getter.getPosition,
    now: createClock().now,
  });

  const pending = request.resolve({ timeoutMs: 15000 });
  await getter.settle(0, POSITION);

  assert.deepEqual(await pending, POSITION);
});

// Đây là lý do tính năng này tồn tại: màn quét khởi động định vị ngay khi mở
// camera, nên lúc người dùng canh xong mã QR thì fix thường đã xong.
test("prefetch rồi resolve dùng lại đúng lời gọi đó, không gọi thêm lần nữa", async () => {
  const getter = createDeferredGetter();
  const clock = createClock();
  const request = createPositionRequest({
    getPosition: getter.getPosition,
    now: clock.now,
  });

  request.prefetch();
  assert.equal(getter.callCount, 1, "prefetch phải bắt đầu lời gọi ngay");

  // Người dùng mất 5 giây canh mã QR; lời gọi đã chạy sẵn suốt 5 giây đó.
  clock.advance(5000);
  const pending = request.resolve({ timeoutMs: 15000 });

  assert.equal(getter.callCount, 1, "không được bắt đầu lời gọi thứ hai");
  await getter.settle(0, POSITION);
  assert.deepEqual(await pending, POSITION);
});

test("hết hạn chờ thì trả null nhưng vẫn giữ lời gọi đang chạy", async () => {
  const getter = createDeferredGetter();
  const clock = createClock();
  let timeoutFired;
  const request = createPositionRequest({
    getPosition: getter.getPosition,
    now: clock.now,
    // Hạn chờ giả: test tự bấm giờ thay vì chờ thật.
    setTimer: (callback) => {
      timeoutFired = callback;
      return null;
    },
    clearTimer: () => {},
  });

  const pending = request.resolve({ timeoutMs: 15000 });
  timeoutFired();

  assert.equal(await pending, null, "quá hạn chờ phải trả null");
  assert.equal(getter.callCount, 1);
});

// Ở hầm gửi xe, fix có thể về ở giây thứ 18. Nút "Thử lại" phải bám vào chính
// lời gọi đang chạy để lần thử thứ hai trả kết quả ngay, không bắt chờ lại từ
// đầu.
test("thử lại sau khi hết hạn chờ bám vào lời gọi cũ và nhận kết quả của nó", async () => {
  const getter = createDeferredGetter();
  const clock = createClock();
  const timers = [];
  const request = createPositionRequest({
    getPosition: getter.getPosition,
    now: clock.now,
    setTimer: (callback) => {
      timers.push(callback);
      return timers.length - 1;
    },
    clearTimer: () => {},
  });

  const first = request.resolve({ timeoutMs: 15000 });
  timers[0]();
  assert.equal(await first, null);

  clock.advance(3000);
  const retry = request.resolve({ timeoutMs: 15000 });
  assert.equal(getter.callCount, 1, "thử lại không được gọi định vị lần nữa");

  await getter.settle(0, POSITION);
  assert.deepEqual(await retry, POSITION);
});

test("vị trí vừa đo xong được dùng lại trong cửa sổ cho phép", async () => {
  const getter = createDeferredGetter();
  const clock = createClock();
  const request = createPositionRequest({
    getPosition: getter.getPosition,
    now: clock.now,
    reuseWindowMs: 30000,
  });

  const first = request.resolve({ timeoutMs: 15000 });
  await getter.settle(0, POSITION);
  await first;

  clock.advance(29000);
  assert.deepEqual(await request.resolve({ timeoutMs: 15000 }), POSITION);
  assert.equal(getter.callCount, 1, "trong cửa sổ tái dùng thì không đo lại");
});

test("quá cửa sổ tái dùng thì đo lại", async () => {
  const getter = createDeferredGetter();
  const clock = createClock();
  const request = createPositionRequest({
    getPosition: getter.getPosition,
    now: clock.now,
    reuseWindowMs: 30000,
  });

  const first = request.resolve({ timeoutMs: 15000 });
  await getter.settle(0, POSITION);
  await first;

  clock.advance(31000);
  const second = request.resolve({ timeoutMs: 15000 });
  assert.equal(getter.callCount, 2, "vị trí quá cũ phải đo lại");

  const newer = { ...POSITION, accuracy: 8 };
  await getter.settle(1, newer);
  assert.deepEqual(await second, newer);
});

test("lời gọi định vị lỗi thì trả null và lần sau đo lại", async () => {
  let callCount = 0;
  const request = createPositionRequest({
    getPosition: () => {
      callCount += 1;
      return Promise.reject(new Error("Location provider is unavailable"));
    },
    now: createClock().now,
  });

  assert.equal(await request.resolve({ timeoutMs: 15000 }), null);
  assert.equal(await request.resolve({ timeoutMs: 15000 }), null);
  assert.equal(callCount, 2, "thất bại không được ghi nhớ như kết quả");
});

test("kết quả null không bị ghi nhớ như một vị trí hợp lệ", async () => {
  const getter = createDeferredGetter();
  const request = createPositionRequest({
    getPosition: getter.getPosition,
    now: createClock().now,
    reuseWindowMs: 30000,
  });

  const first = request.resolve({ timeoutMs: 15000 });
  await getter.settle(0, null);
  assert.equal(await first, null);

  const second = request.resolve({ timeoutMs: 15000 });
  assert.equal(getter.callCount, 2);

  // Kết thúc lượt đo thứ hai để test không bỏ lại hạn chờ 15 giây đang chạy.
  await getter.settle(1, POSITION);
  assert.deepEqual(await second, POSITION);
});

test("reset xoá vị trí đã nhớ để phiên quét sau đo lại từ đầu", async () => {
  const getter = createDeferredGetter();
  const clock = createClock();
  const request = createPositionRequest({
    getPosition: getter.getPosition,
    now: clock.now,
    reuseWindowMs: 30000,
  });

  const first = request.resolve({ timeoutMs: 15000 });
  await getter.settle(0, POSITION);
  await first;

  request.reset();
  clock.advance(1000);
  const second = request.resolve({ timeoutMs: 15000 });

  assert.equal(getter.callCount, 2, "sau reset phải đo lại dù vị trí còn mới");

  // Kết thúc lượt đo thứ hai để test không bỏ lại hạn chờ 15 giây đang chạy.
  await getter.settle(1, POSITION);
  assert.deepEqual(await second, POSITION);
});
