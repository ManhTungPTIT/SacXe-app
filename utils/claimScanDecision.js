const PUBLIC_DEVICE_CLAIM_MESSAGE =
  "\u0110\u00e2y l\u00e0 tr\u1ea1m c\u00f4ng c\u1ed9ng\u2026";

const getDeviceDocument = (response) => {
  if (!response) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(response, "data")) {
    const data = response.data;
    return data?.eChargeDevices || data?.device || data?.data || data || null;
  }

  return response.eChargeDevices || response.device || response;
};

const getClaimScanDecision = (response) => {
  const device = getDeviceDocument(response);

  if (!device) {
    return { type: "invalid" };
  }

  if (device?.isHouse === true || device?.isHouse === "true") {
    return { type: "claim" };
  }

  return {
    type: "singleCharge",
    message: PUBLIC_DEVICE_CLAIM_MESSAGE,
  };
};

const SCAN_SUCCESS_MESSAGE = 'Quét mã QR tại trụ sạc thành công!';

// Quét lại trụ nhà dân đã thuộc tài khoản vẫn là một lần quét hợp lệ — app đi
// thẳng vào danh sách ổ sạc. Nhưng báo "thành công" ở đây khiến người dùng vừa
// bấm "Thêm thiết bị" hiểu là vừa thêm được một trụ nữa. Nói thẳng trụ đã có
// sẵn thì họ biết vì sao không có gì mới xuất hiện trong danh sách.
const ALREADY_OWNED_SCAN_MESSAGE = 'Trụ này đã có sẵn trong tài khoản của bạn.';

const getScanToastMessage = (params) =>
  params?.alreadyOwned === true
    ? ALREADY_OWNED_SCAN_MESSAGE
    : SCAN_SUCCESS_MESSAGE;

const getClaimSuccessDecision = (response) => {
  const payload = response?.data || response;

  return payload?.alreadyOwned === true
    ? { type: 'alreadyOwned' }
    : { type: 'claimed' };
};

module.exports = {
  PUBLIC_DEVICE_CLAIM_MESSAGE,
  SCAN_SUCCESS_MESSAGE,
  ALREADY_OWNED_SCAN_MESSAGE,
  getScanToastMessage,
  getClaimScanDecision,
  getClaimSuccessDecision,
  getDeviceDocument,
};
