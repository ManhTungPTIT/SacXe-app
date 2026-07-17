const assert = require("node:assert/strict");
const test = require("node:test");

const {
  PUBLIC_DEVICE_CLAIM_MESSAGE,
  getClaimScanDecision,
} = require("../claimScanDecision");

test("claim scan decision allows claiming house devices from raw document responses", () => {
  assert.deepEqual(
    getClaimScanDecision({
      _id: "device-1",
      deviceCode: "EV-001",
      isHouse: true,
    }),
    { type: "claim" },
  );
});

test("claim scan decision redirects public devices to one-time charging", () => {
  assert.deepEqual(
    getClaimScanDecision({
      data: {
        eChargeDevices: {
          _id: "device-2",
          deviceCode: "EV-002",
          isHouse: false,
        },
      },
    }),
    {
      type: "singleCharge",
      message: PUBLIC_DEVICE_CLAIM_MESSAGE,
    },
  );
});

test("claim scan decision treats missing isHouse as public charging flow", () => {
  assert.deepEqual(
    getClaimScanDecision({
      data: {
        _id: "device-3",
        deviceCode: "EV-003",
      },
    }),
    {
      type: "singleCharge",
      message: PUBLIC_DEVICE_CLAIM_MESSAGE,
    },
  );
});
test("claim scan decision reports invalid when no device document is returned", () => {
  assert.deepEqual(getClaimScanDecision({ data: null }), {
    type: "invalid",
  });
});