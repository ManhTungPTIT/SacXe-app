const assert = require("node:assert/strict");
const { test } = require("node:test");
const { getActiveSessions, pickActiveSession } = require("../activeSessionPick");

const sessions = [
  { _id: "done", totalTime: { seconds: 1 } },
  { _id: "a", deviceId: { deviceCode: "D1" }, powerId: { _id: "p1", index: 1 } },
  { _id: "b", deviceId: { deviceCode: "D2" }, powerId: { _id: "p2", index: 2 } },
];

test("filters only active sessions", () => {
  assert.deepEqual(getActiveSessions({ sessions }).map((session) => session._id), ["a", "b"]);
});

test("picks by selected history, power id, or outlet", () => {
  assert.equal(pickActiveSession({ sessions }, { selectedHistoryId: "b" })._id, "b");
  assert.equal(pickActiveSession({ sessions }, { powerId: "p1" })._id, "a");
  assert.equal(pickActiveSession({ sessions }, { deviceCode: "D2", powerIndex: 2 })._id, "b");
});
