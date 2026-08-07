// Điều phối MỘT lời gọi định vị dùng chung cho cả một phiên quét QR.
//
// Vì sao cần: bước kiểm tra khoảng cách chỉ chấp nhận toạ độ đo tươi (xem
// docs/superpowers/specs/2026-08-01-qr-scan-proximity-check-design.md, mục cập
// nhật 2026-08-05 — cố ý không dùng last-known position). Nhưng ở hầm gửi xe,
// lần bắt fix đầu tiên có thể mất hơn 15 giây, nên nếu chỉ bắt đầu đo lúc quét
// được mã QR thì hạn chờ nào cũng hay trượt.
//
// Cách gỡ: bắt đầu đo ngay khi mở màn quét (prefetch), rồi lúc quét xong thì
// bám vào chính lời gọi đó thay vì mở lời gọi mới. Toạ độ vẫn là fix tươi, đo
// trong lúc người dùng đang đứng tại trụ — chỉ khác là đồng hồ bắt đầu chạy
// sớm hơn vài giây.
//
// Thuần JavaScript, mọi thứ chạm hệ thống đều tiêm vào, để kiểm thử được bằng
// `node --test`. Phần nối với expo-location nằm ở services/location.service.js.

// Toạ độ đo xong còn dùng lại được trong khoảng này. Đây KHÔNG phải last-known
// position của hệ điều hành: nó là fix vừa đo trong chính phiên quét, tại chỗ
// người dùng đang đứng. Cửa sổ ngắn để lần thử lại sau khi hết hạn chờ không
// phải đo lại từ đầu.
const DEFAULT_REUSE_WINDOW_MS = 30000;

const createPositionRequest = ({
  getPosition,
  now = Date.now,
  reuseWindowMs = DEFAULT_REUSE_WINDOW_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) => {
  // Lời gọi đang chạy. Giữ lại để mọi người hỏi cùng lúc đều bám vào nó.
  let pending = null;
  // { position, measuredAt } của lần đo gần nhất thành công.
  let measured = null;

  const getReusablePosition = () => {
    if (!measured) return null;

    return now() - measured.measuredAt <= reuseWindowMs ? measured.position : null;
  };

  const start = () => {
    if (pending) return pending;

    // Gọi thẳng, không qua Promise.resolve().then(getPosition): prefetch phải
    // đẩy yêu cầu xuống hệ điều hành ngay lúc mở màn quét, lùi lại dù chỉ một
    // micro-task cũng là lùi mất phần thời gian mà cả cơ chế này sinh ra để
    // giành lấy.
    let call;
    try {
      call = getPosition();
    } catch (error) {
      call = null;
    }

    // Bắt lỗi ngay tại chỗ: lời gọi thất bại SAU khi hạn chờ đã trôi qua không
    // được trở thành unhandled rejection.
    const request = Promise.resolve(call)
      .catch(() => null)
      .then((position) => {
        if (position) {
          measured = { position, measuredAt: now() };
        }
        // Chỉ dọn nếu chưa ai bắt đầu lượt mới, tránh xoá nhầm lời gọi khác.
        if (pending === request) {
          pending = null;
        }
        return position ?? null;
      });

    pending = request;
    return request;
  };

  // Bắt đầu đo sớm và bỏ qua kết quả. Gọi lúc mở màn quét.
  const prefetch = () => {
    if (getReusablePosition()) return;
    start();
  };

  // Trả toạ độ, hoặc null nếu hết hạn chờ mà chưa có. Hết hạn chờ KHÔNG huỷ
  // lời gọi đang chạy — lần thử lại sẽ nhận kết quả của nó ngay khi máy bắt
  // được fix.
  const resolve = ({ timeoutMs }) => {
    const reusable = getReusablePosition();
    if (reusable) return Promise.resolve(reusable);

    const request = start();

    return new Promise((resolveOuter) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimer(timer);
        resolveOuter(value ?? null);
      };

      const timer = setTimer(() => finish(null), timeoutMs);
      request.then(finish, () => finish(null));
    });
  };

  // Quên toạ độ đã đo. Gọi khi rời màn quét, để phiên quét sau (có thể ở trụ
  // khác) không dùng lại toạ độ của phiên trước.
  const reset = () => {
    measured = null;
  };

  return { prefetch, resolve, reset };
};

module.exports = { DEFAULT_REUSE_WINDOW_MS, createPositionRequest };
