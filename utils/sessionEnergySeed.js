// Giá trị năng lượng khởi tạo cho màn phiên sạc, và cách nhận biết đã sang
// phiên khác.
//
// LỖI ĐƯỢC SỬA: màn phiên sạc từng hiển thị năng lượng của phiên TRƯỚC.
//
// `latestHistory` là bản ghi phiên gần nhất, không phải "phiên đang chạy". Khi
// người dùng vừa bấm sạc, `isConfirmedSessionPendingSync` bật màn phiên sạc lên
// NGAY (ChargeScreen.js:128-130) trong khi cache ["latestHistory"] vẫn còn là
// phiên cũ đã chốt — refetch chưa về. Màn hình vì vậy seed năng lượng bằng tổng
// của phiên trước.
//
// Tệ hơn, hook giữ giá trị bằng Math.max để "không bị tụt khi refetch". Đúng
// trong phạm vi MỘT phiên, nhưng khiến số rò rỉ từ phiên cũ đóng cứng lại: lúc
// refetch trả về phiên mới với 0.095 kWh thì max vẫn giữ 1.xxx.
//
// Quan sát khớp: gói telemetry đầu tiên báo energy = 0.095 mà màn hình hiện
// 1.xxx kWh.

// Năng lượng seed hợp lệ cho phiên ĐANG chạy.
//
// Phiên đã chốt (có totalTime, hoặc client đã tự đánh dấu dừng) KHÔNG được dùng
// làm seed: lúc đó nó là phiên cũ, phiên mới bắt đầu từ 0 và sẽ tự bò lên theo
// telemetry.
const resolveSessionSeedEnergyKwh = (history) => {
  if (!history) {
    return 0;
  }

  const isFinalized = Boolean(history.totalTime || history.clientSessionStopped);
  if (isFinalized) {
    return 0;
  }

  const energy = Number(history.lastKnownEnergy ?? history.energy ?? 0);
  return Number.isFinite(energy) ? Math.max(0, energy) : 0;
};

// Mốc bắt đầu để đếm giờ ở màn phiên sạc.
//
// Y HỆT lỗi seed năng lượng ở trên, chỉ khác trường — và đã gặp thật: đồng hồ
// đếm giờ "không reset về 0 sau mỗi phiên", vào màn phiên sạc mới đã hiện hơn
// 1 phút. Nguyên nhân chung một chỗ: `latestHistory` là bản ghi phiên GẦN NHẤT,
// và lúc phiên mới vừa mở thì cache đó còn là phiên TRƯỚC (đã chốt) vì refetch
// chưa về. Lấy `createdAt` của nó làm mốc là đếm tiếp giờ của phiên cũ.
//
// Trả null (không phải undefined) cho phiên đã chốt: phía gọi dùng nó để dừng
// đồng hồ và đưa số hiển thị về 00:00:00, thay vì giữ lại số của phiên trước.
const resolveSessionStartTime = (history) => {
  if (!history) {
    return null;
  }

  const isFinalized = Boolean(history.totalTime || history.clientSessionStopped);
  if (isFinalized) {
    return null;
  }

  return history.startTime || history.createdAt || null;
};

// Khoá nhận dạng phiên. Đổi khoá = đã sang phiên khác = phải RESET giá trị đang
// hiển thị, không được lấy max với giá trị cũ.
//
// Trả null khi chưa có phiên nào; null -> có id cũng tính là đổi phiên.
const resolveSessionKey = (history) => {
  const id = history?._id;
  return id === undefined || id === null ? null : String(id);
};

// Có phải đã sang phiên khác không.
const isNewSession = (previousKey, nextKey) => previousKey !== nextKey;

module.exports = {
  resolveSessionSeedEnergyKwh,
  resolveSessionStartTime,
  resolveSessionKey,
  isNewSession,
};
