const assert = require("node:assert/strict");
const test = require("node:test");

const {
  getDeviceCoordinates,
  getDistanceMeters,
  getProximityDecision,
} = require("../proximity");

// Một độ vĩ tuyến trên hình cầu bán kính 6371008.8m. Dịch chuyển thuần theo vĩ
// độ cho khoảng cách đúng bằng cung kinh tuyến, nên các ca dưới đây có khoảng
// cách xác định chính xác mà không cần tra bảng.
const METERS_PER_DEGREE_LAT = 111194.93;

const DEVICE = {
  _id: "device-1",
  deviceCode: "plug_94FB9C",
  latitude: 21.0285,
  longitude: 105.8542,
};

const positionAway = (meters, accuracy) => ({
  latitude: DEVICE.latitude + meters / METERS_PER_DEGREE_LAT,
  longitude: DEVICE.longitude,
  accuracy,
});

test("haversine matches one degree of latitude on the reference sphere", () => {
  const distance = getDistanceMeters(
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
  );

  assert.ok(
    Math.abs(distance - METERS_PER_DEGREE_LAT) < 1,
    `expected ~${METERS_PER_DEGREE_LAT}m, got ${distance}m`,
  );
});

test("standing at the station is in range", () => {
  const decision = getProximityDecision({
    position: { ...DEVICE, accuracy: 5 },
    device: DEVICE,
  });

  assert.equal(decision.type, "inRange");
});

test("99m away with a sharp fix is in range", () => {
  const decision = getProximityDecision({
    position: positionAway(99, 5),
    device: DEVICE,
  });

  assert.equal(decision.type, "inRange");
});

test("150m away with a sharp fix is out of range", () => {
  const decision = getProximityDecision({
    position: positionAway(150, 5),
    device: DEVICE,
  });

  assert.equal(decision.type, "outOfRange");
  assert.ok(Math.abs(decision.distanceMeters - 150) < 1);
});

test("a wide but plausible fix widens the allowed radius", () => {
  const decision = getProximityDecision({
    position: positionAway(250, 200),
    device: DEVICE,
  });

  assert.equal(decision.type, "inRange");
});

test("an absurd accuracy claim is capped at the tolerance ceiling", () => {
  // 250m vẫn lọt vì trần nới 200m, nhưng mức nới không vượt quá trần dù client
  // khai sai số lớn tới đâu.
  assert.equal(
    getProximityDecision({
      position: positionAway(250, 100000),
      device: DEVICE,
    }).type,
    "inRange",
  );

  assert.equal(
    getProximityDecision({
      position: positionAway(400, 100000),
      device: DEVICE,
    }).type,
    "outOfRange",
  );
});

test("a missing accuracy reading grants no tolerance", () => {
  assert.equal(
    getProximityDecision({
      position: positionAway(150, null),
      device: DEVICE,
    }).type,
    "outOfRange",
  );
});

test("a station without coordinates skips the check", () => {
  const decision = getProximityDecision({
    position: positionAway(5000, 5),
    device: { ...DEVICE, latitude: null, longitude: null },
  });

  assert.equal(decision.type, "unknownDevice");
});

test("a station stored as zero coordinates skips the check", () => {
  const decision = getProximityDecision({
    position: positionAway(5000, 5),
    device: { ...DEVICE, latitude: 0, longitude: 0 },
  });

  assert.equal(decision.type, "unknownDevice");
});

test("a station with only GeoJSON coordinates is read correctly", () => {
  const coordinates = getDeviceCoordinates({
    _id: "device-2",
    location: { type: "Point", coordinates: [105.8542, 21.0285] },
  });

  assert.deepEqual(coordinates, { latitude: 21.0285, longitude: 105.8542 });
});

test("the station document is unwrapped from an API response envelope", () => {
  const decision = getProximityDecision({
    position: positionAway(20, 5),
    device: { data: { eChargeDevices: DEVICE } },
  });

  assert.equal(decision.type, "inRange");
});

test("string coordinates from the API are parsed", () => {
  const decision = getProximityDecision({
    position: positionAway(20, 5),
    device: { ...DEVICE, latitude: "21.0285", longitude: "105.8542" },
  });

  assert.equal(decision.type, "inRange");
});

test("a missing user position is reported separately from a missing station", () => {
  assert.equal(
    getProximityDecision({ position: null, device: DEVICE }).type,
    "unknownPosition",
  );
});
