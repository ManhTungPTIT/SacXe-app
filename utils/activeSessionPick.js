const normalizeId = (value) =>
  value === undefined || value === null ? "" : String(value).trim();

const getActiveSessions = (payload) => {
  const sessions = Array.isArray(payload?.sessions)
    ? payload.sessions
    : Array.isArray(payload)
      ? payload
      : [];

  return sessions.filter((session) =>
    Boolean(session && !session.totalTime && !session.clientSessionStopped),
  );
};

const getSessionDeviceCode = (session = {}) =>
  normalizeId(session?.deviceId?.deviceCode ?? session?.deviceCode ?? session?.deviceId);

const getSessionPowerIndex = (session = {}) =>
  normalizeId(session?.powerId?.index ?? session?.powerIndex);

const getSessionPowerId = (session = {}) =>
  normalizeId(session?.powerId?._id ?? session?.powerId);

const pickActiveSession = (sessions, criteria = {}) => {
  const activeSessions = getActiveSessions(sessions);
  if (!activeSessions.length) {
    return null;
  }

  const selectedHistoryId = normalizeId(criteria.selectedHistoryId);
  if (selectedHistoryId) {
    const byHistoryId = activeSessions.find(
      (session) => normalizeId(session?._id) === selectedHistoryId,
    );
    if (byHistoryId) return byHistoryId;
  }

  const requestedPowerId = normalizeId(criteria.powerId);
  if (requestedPowerId) {
    const byPowerId = activeSessions.find(
      (session) => getSessionPowerId(session) === requestedPowerId,
    );
    if (byPowerId) return byPowerId;
  }

  const requestedDeviceCode = normalizeId(criteria.deviceCode);
  const requestedPowerIndex = normalizeId(criteria.powerIndex);
  if (requestedDeviceCode || requestedPowerIndex) {
    const byOutlet = activeSessions.find((session) => {
      const deviceMatches =
        !requestedDeviceCode || getSessionDeviceCode(session) === requestedDeviceCode;
      const powerMatches =
        !requestedPowerIndex || getSessionPowerIndex(session) === requestedPowerIndex;
      return deviceMatches && powerMatches;
    });
    if (byOutlet) return byOutlet;
  }

  return activeSessions[0];
};

module.exports = {
  normalizeId,
  getActiveSessions,
  pickActiveSession,
};
