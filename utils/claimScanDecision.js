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

module.exports = {
  PUBLIC_DEVICE_CLAIM_MESSAGE,
  getClaimScanDecision,
  getDeviceDocument,
};
