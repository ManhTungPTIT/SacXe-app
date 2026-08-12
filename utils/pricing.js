// Biểu giá điện — PHÍA HIỂN THỊ.
//
// Tiền thực tế do backend tính và trừ ví (cộng dồn theo từng phần kWh × đơn giá
// tại thời điểm tiêu thụ). Frontend KHÔNG tự tính tiền phiên — chỉ hiển thị số
// tiền backend trả về và cho biết đơn giá đang áp dụng để người dùng dễ theo dõi.
//
// Khung giờ (giờ Việt Nam, mọi ngày):
//   - Thấp điểm : 22:00 → 04:00 (hôm sau)
//   - Cao điểm  : 09:30 → 11:30 và 17:00 → 20:00
//   - Bình thường: các khoảng còn lại

// Chế độ tính giá mặc định — CHỈ dùng cho phiên cũ không mang đơn giá. Giá thật
// của phiên do admin chung cư đặt, backend chốt vào History.unitPrice lúc mở
// phiên và trả kèm trong dữ liệu phiên. Các hằng dưới đây là mức dự phòng khi
// phiên không có unitPrice (phiên mở trước khi có tính năng chỉnh giá).
const PRICING_MODE = "flat";

// Giá phẳng mặc định (đồng/kWh) khi phiên không mang đơn giá riêng.
const FLAT_RATE_VND = 6000;

// Bảng giá (đồng/kWh) theo cấp điện áp — chỉ dùng khi PRICING_MODE = 'tou',
// phải khớp backend (src/utils/pricing.js).
const RATE_TABLE = {
  UNDER_6KV: { normal: 1987, offPeak: 1300, peak: 3640 },
  FROM_6_TO_UNDER_22KV: { normal: 1899, offPeak: 1234, peak: 3508 },
  FROM_22_TO_UNDER_110KV: { normal: 1833, offPeak: 1190, peak: 3398 },
};

// Cấp điện áp áp dụng cho toàn bộ trụ sạc hiện tại (trụ hạ áp xe máy điện).
const ACTIVE_VOLTAGE_LEVEL = "UNDER_6KV";

const PERIOD_LABELS = {
  normal: "Bình thường",
  offPeak: "Thấp điểm",
  peak: "Cao điểm",
};

const OFF_PEAK_EVENING_START = 22 * 60; // 22:00
const OFF_PEAK_MORNING_END = 4 * 60; // 04:00
const PEAK_MORNING_START = 9 * 60 + 30; // 09:30
const PEAK_MORNING_END = 11 * 60 + 30; // 11:30
const PEAK_EVENING_START = 17 * 60; // 17:00
const PEAK_EVENING_END = 20 * 60; // 20:00

// Phút-trong-ngày theo giờ Việt Nam, độc lập với timezone thiết bị.
const getVnMinutesOfDay = (date = new Date()) => {
  const time = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (!Number.isFinite(time)) {
    return 0;
  }
  const vn = new Date(time + 7 * 60 * 60 * 1000);
  return vn.getUTCHours() * 60 + vn.getUTCMinutes();
};

// Khung giờ ('offPeak' | 'peak' | 'normal') tại thời điểm cho trước.
const getPeriodAtTime = (date = new Date()) => {
  const minutes = getVnMinutesOfDay(date);

  if (minutes >= OFF_PEAK_EVENING_START || minutes < OFF_PEAK_MORNING_END) {
    return "offPeak";
  }
  if (
    (minutes >= PEAK_MORNING_START && minutes < PEAK_MORNING_END) ||
    (minutes >= PEAK_EVENING_START && minutes < PEAK_EVENING_END)
  ) {
    return "peak";
  }
  return "normal";
};

const getRateTable = (voltageLevel = ACTIVE_VOLTAGE_LEVEL) =>
  RATE_TABLE[voltageLevel] || RATE_TABLE[ACTIVE_VOLTAGE_LEVEL];

// Thông tin đơn giá đang áp dụng: { period, label, rate } — dùng để hiển thị.
// period: null khi không có khung giờ (giá phẳng / giá riêng của chung cư) —
// UI dựa vào đây để ẩn badge khung giờ.
//
// unitPrice: đơn giá đã chốt của phiên (History.unitPrice). Có thì luôn thắng —
// đó là con số backend thực sự dùng để trừ ví. unitPrice <= 0 hoặc không phải
// số thì rơi về bảng giá mặc định, KHÔNG hiển thị 0đ/kWh.
const getCurrentRateInfo = (date = new Date(), options = {}) => {
  const { unitPrice, voltageLevel = ACTIVE_VOLTAGE_LEVEL } = options;

  const sessionRate = Number(unitPrice);
  if (Number.isFinite(sessionRate) && sessionRate > 0) {
    return { period: null, label: null, rate: sessionRate };
  }

  if (PRICING_MODE === "flat") {
    return { period: null, label: null, rate: FLAT_RATE_VND };
  }

  const period = getPeriodAtTime(date);
  return {
    period,
    label: PERIOD_LABELS[period],
    rate: getRateTable(voltageLevel)[period],
  };
};

// Định dạng tiền VND theo locale vi-VN (ví dụ: 12.480).
const formatPrice = (value) => {
  const price = Number(value) || 0;
  return price.toLocaleString("vi-VN");
};

module.exports = {
  PRICING_MODE,
  FLAT_RATE_VND,
  RATE_TABLE,
  ACTIVE_VOLTAGE_LEVEL,
  PERIOD_LABELS,
  getPeriodAtTime,
  getCurrentRateInfo,
  formatPrice,
};
