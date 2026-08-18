const assert = require("node:assert/strict");
const test = require("node:test");

const {
  PUBLIC_DEVICE_CLAIM_MESSAGE,
  getClaimScanDecision,
  getClaimSuccessDecision,
  getScanToastMessage,
  SCAN_SUCCESS_MESSAGE,
  ALREADY_OWNED_SCAN_MESSAGE,
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

test('claim success decision opens an already-owned device immediately', () => {
  assert.deepEqual(getClaimSuccessDecision({ alreadyOwned: true }), {
    type: 'alreadyOwned',
  });
});

test('claim success decision keeps the success notice for a newly claimed device', () => {
  assert.deepEqual(getClaimSuccessDecision({ alreadyOwned: false }), {
    type: 'claimed',
  });
});

test('claim success decision supports an axios-style response wrapper', () => {
  assert.deepEqual(
    getClaimSuccessDecision({ data: { alreadyOwned: true } }),
    { type: 'alreadyOwned' },
  );
});

test('scan toast keeps the generic success notice for a normal scan', () => {
  assert.equal(
    getScanToastMessage({ alreadyOwned: false }),
    SCAN_SUCCESS_MESSAGE,
  );
});

test('scan toast tells the user a home device is already in their account', () => {
  assert.equal(
    getScanToastMessage({ alreadyOwned: true }),
    ALREADY_OWNED_SCAN_MESSAGE,
  );
});

test('scan toast falls back to the success notice when the flag is missing', () => {
  assert.equal(getScanToastMessage(), SCAN_SUCCESS_MESSAGE);
  assert.equal(getScanToastMessage({}), SCAN_SUCCESS_MESSAGE);
});

test('scan toast ignores a non-boolean already-owned value', () => {
  assert.equal(
    getScanToastMessage({ alreadyOwned: 'true' }),
    SCAN_SUCCESS_MESSAGE,
  );
});
