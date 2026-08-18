const DEFAULT_CHARGE_TITLE = "Phiên sạc";
const HOME_CHARGE_TITLE = "Phiên sạc tại nhà";
const PUBLIC_CHARGE_TITLE = "Phiên sạc công cộng";

// Tiêu đề màn Phiên sạc bám theo chargeMode chứ không theo bước đang đứng.
//
// chargeMode tự sửa về đúng loại trụ ngay khi thiết bị load xong (xem effect
// setChargeMode(isSelectedHouseDevice ? "home" : "public") trong ChargeScreen),
// kể cả đường khôi phục phiên sạc dở lúc mở lại app. Nhờ vậy tiêu đề giữ nguyên
// suốt từ lúc chọn loại trụ tới khi phiên sạc kết thúc, không nhảy về chữ chung.
//
// Mode lạ hoặc chưa chọn thì lùi về tiêu đề chung — không đoán bừa một loại trụ.
const getChargeScreenTitle = (chargeMode) => {
  if (chargeMode === "home") {
    return HOME_CHARGE_TITLE;
  }

  if (chargeMode === "public") {
    return PUBLIC_CHARGE_TITLE;
  }

  return DEFAULT_CHARGE_TITLE;
};

module.exports = {
  DEFAULT_CHARGE_TITLE,
  HOME_CHARGE_TITLE,
  PUBLIC_CHARGE_TITLE,
  getChargeScreenTitle,
};
