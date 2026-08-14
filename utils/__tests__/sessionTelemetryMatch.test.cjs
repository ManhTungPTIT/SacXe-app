const assert = require("node:assert/strict");
const { test } = require("node:test");
const { matchesSessionTelemetry } = require("../sessionTelemetryMatch");

test("matches by historyId when payload carries one", () => {
  assert.equal(matchesSessionTelemetry({ _id: "h1" }, { historyId: "h1" }), true);
  assert.equal(matchesSessionTelemetry({ _id: "h1" }, { historyId: "h2" }), false);
});

test("falls back to device and outlet for legacy payloads", () => {
  const session = { deviceId: { deviceCode: "D1" }, powerId: { index: 2 } };
  assert.equal(matchesSessionTelemetry(session, { deviceCode: "D1", powerIndex: 2 }), true);
  assert.equal(matchesSessionTelemetry(session, { deviceCode: "D1", powerIndex: 3 }), false);
});
