// Tên hiển thị của một trụ sạc. Chủ trụ nhà dân đặt tên ở bước thiết lập lần
// đầu; chưa đặt (hoặc xoá trắng) thì lùi về mã trụ.
//
// Gom vào một hàm vì tên trụ hiện ở nhiều màn (danh sách "Trụ sạc của bạn",
// modal Thiết bị, header màn chọn ổ). Mỗi màn tự viết `device.name ||
// device.deviceCode` thì chỉ cần một chỗ quên trim là cùng một trụ hiện hai tên
// khác nhau ở hai màn.
//
// deviceCode KHÔNG bị thay thế: nó vẫn là khoá định danh trong mọi lời gọi API,
// route param và so khớp — hàm này chỉ lo phần chữ hiện ra cho người dùng.
const getDeviceDisplayName = (device) => {
  const name = typeof device?.name === "string" ? device.name.trim() : "";

  if (name) {
    return name;
  }

  const deviceCode = device?.deviceCode;
  return typeof deviceCode === "string" ? deviceCode : "";
};

// True khi tên hiển thị là tên tự đặt chứ không phải mã trụ — chỗ nào muốn hiện
// thêm mã trụ làm dòng phụ thì hỏi hàm này để khỏi in mã trụ hai lần.
const hasCustomDeviceName = (device) =>
  getDeviceDisplayName(device) !== (device?.deviceCode || "");

module.exports = {
  getDeviceDisplayName,
  hasCustomDeviceName,
};
