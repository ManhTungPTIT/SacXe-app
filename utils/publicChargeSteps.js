// Ba bước hướng dẫn của luồng sạc trụ công cộng, dành cho người dùng lần đầu.
//
// Vì sao tách ra hàm thuần thay vì tính thẳng trong ChargeScreen: thanh bước
// phải chỉ ĐÚNG màn đang hiện, mà điều kiện phân nhánh nằm rải ở ba chỗ khác
// nhau (ChargeScreen chọn BikeRegistration, InitiateChargeComponent chọn nhánh
// theo mode, DevicesComponents hiện khi có deviceCode). Chép lại điều kiện ở
// mỗi chỗ là cách chắc chắn để chúng trôi khỏi nhau. Ở đây chỉ có một bản, test
// được bằng node --test, và hai component chỉ việc nhận số bước.

const PUBLIC_CHARGE_STEPS = ["Giấy tờ xe", "Quét mã trụ", "Chọn ổ sạc"];

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

// Bước đang đứng trong luồng công cộng: 1, 2 hoặc 3.
//
// Thứ tự kiểm tra là phần dễ sai: giấy tờ xe phải xét TRƯỚC mã trụ. ChargeScreen
// giữ deviceCode trong state qua các bước, nên một người chưa có giấy tờ vẫn có
// thể đang mang deviceCode của lần quét trước — xét mã trụ trước sẽ báo họ đang
// ở bước 3 trong khi màn hình đang bắt họ đăng ký giấy tờ.
//
// Dữ liệu vào hỏng thì lùi về bước 1: đây là phần trang trí, không được làm sập
// màn hình vì một tham số thiếu.
// Chọn xong ổ sạc thì cả ba bước đã hết, nên hàm trả 4 — LỚN HƠN số bước.
// ChargeStepper đánh dấu xong bằng "stepNumber < currentStep", nên một số vượt
// khung là đủ để bước 3 hiện dấu tích, không cần thêm khái niệm "đã hoàn tất"
// riêng cho bước cuối và không phải sửa component vẽ.
const resolvePublicChargeStep = ({ hasBike, deviceCode, powerId } = {}) => {
  if (!hasBike) {
    return 1;
  }

  if (!hasValue(deviceCode)) {
    return 2;
  }

  return hasValue(powerId) ? PUBLIC_CHARGE_STEPS.length + 1 : 3;
};

module.exports = {
  PUBLIC_CHARGE_STEPS,
  resolvePublicChargeStep,
};
