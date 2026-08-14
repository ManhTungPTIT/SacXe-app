const normalizeId = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const getSessionId = (session) => normalizeId(session?._id ?? session?.historyId ?? session);

const getSessionDeviceCode = (session = {}) =>
  normalizeId(session?.deviceId?.deviceCode ?? session?.deviceCode ?? session?.deviceId);

const getSessionPowerIndex = (session = {}) =>
  normalizeId(session?.powerId?.index ?? session?.powerIndex);

const getTelemetryDeviceCode = (telemetry = {}) =>
  normalizeId(telemetry?.deviceCode ?? telemetry?.deviceId ?? telemetry?.device_id);

const getTelemetryPowerIndex = (telemetry = {}) =>
  normalizeId(
    telemetry?.powerIndex ??
      telemetry?.powerId ??
      telemetry?.plugId ??
      telemetry?.id,
  );

const matchesSessionTelemetry = (session, telemetry) => {
  const sessionId = getSessionId(session);
  const telemetryHistoryId = normalizeId(telemetry?.historyId);

  if (sessionId && telemetryHistoryId) {
    return sessionId === telemetryHistoryId;
  }

  const sessionDeviceCode = getSessionDeviceCode(session);
  const telemetryDeviceCode = getTelemetryDeviceCode(telemetry);
  if (sessionDeviceCode && telemetryDeviceCode && sessionDeviceCode !== telemetryDeviceCode) {
    return false;
  }

  const sessionPowerIndex = getSessionPowerIndex(session);
  const telemetryPowerIndex = getTelemetryPowerIndex(telemetry);
  if (sessionPowerIndex && telemetryPowerIndex && sessionPowerIndex !== telemetryPowerIndex) {
    return false;
  }

  return true;
};

module.exports = {
  normalizeId,
  matchesSessionTelemetry,
};
