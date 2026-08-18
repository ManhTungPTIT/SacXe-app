// Khoá cache cần gỡ khi nhận sự kiện socket `charge_device_status`.
//
// LỖI ĐƯỢC SỬA: kéo/lướt bản đồ ở Trang chủ rất giật trong lúc có phiên sạc.
//
// Sự kiện này nói về trạng thái khả dụng của MỘT ổ trên MỘT trụ, và nó bắn liên
// tục suốt phiên sạc: ổ đổi isUsing, cờ bảo trì bị scanStaleOutlets đánh rồi bị
// gói telemetry kế tiếp gỡ ra (vòng lặp ~10s, chính backend ghi nhận là đánh
// đổi có chủ ý), nhịp hoà giải heartbeat của trụ nhà dân...
//
// Bản cũ gỡ theo tiền tố ["E_CHARGE_DEVICE"]. react-query khớp khoá theo TIỀN
// TỐ, nên nó kéo theo luôn ["E_CHARGE_DEVICE", "ALL", lat, lng] — danh sách trụ
// mà bản đồ Trang chủ đang vẽ. Hệ quả dây chuyền:
//
//   sự kiện -> refetch danh sách trụ -> allDevices đổi định danh
//           -> formattedMarkers (useMemo theo allDevices) dựng lại
//           -> TOÀN BỘ marker native bị tạo lại, ngay giữa lúc tay đang kéo map
//
// MapComponent đã memo và mọi prop từ HomeScreen đều ổn định (useMemo/
// useCallback), nên đây là đường DUY NHẤT khiến bản đồ vẽ lại — cũng là lý do
// lỗi chỉ lộ ra khi đang có phiên sạc, lúc sự kiện này bắn dày.
//
// Gỡ đúng khoá của trụ vừa đổi thì màn chọn ổ (["E_CHARGE_DEVICE", deviceCode])
// vẫn cập nhật realtime như cũ, còn bản đồ không bị đụng tới.
//
// Đánh đổi: nhãn "Trống N chỗ" trong callout của marker không còn tự cập nhật
// theo từng sự kiện; nó làm mới ở lần nạp bình thường (quay lại màn, đổi vị
// trí, đổi từ khoá tìm). Nhãn đó chỉ hiện khi người dùng bấm vào marker, nên
// đổi lại lấy thao tác kéo map mượt là xứng đáng.

const DEVICE_QUERY_PREFIX = "E_CHARGE_DEVICE";

const normalizeId = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const resolveDeviceQueryKey = (data) => {
  const deviceCode = normalizeId(
    data?.deviceCode ?? data?.deviceId ?? data?.device_id,
  );

  // Không có mã trụ thì không biết gỡ cache nào cho đúng. Lùi về hành vi cũ
  // thay vì bỏ qua: thà một lần nạp lại thừa còn hơn để ổ hiện sai trạng thái.
  if (!deviceCode) {
    return [DEVICE_QUERY_PREFIX];
  }

  return [DEVICE_QUERY_PREFIX, deviceCode];
};

module.exports = {
  DEVICE_QUERY_PREFIX,
  resolveDeviceQueryKey,
};
