const assert = require("node:assert/strict");
const test = require("node:test");

const { buildTabBarPaths } = require("../tabBarNotchPath");

const BASE = {
  width: 360,
  height: 68,
  cornerRadius: 24,
  buttonRadius: 34,
  buttonGap: 9,
  buttonCenterY: -24,
};

const numbersIn = (path) => path.match(/-?\d+(\.\d+)?/g).map(Number);

test("trả hai đường: nền khép kín và viền mép trên để hở", () => {
  const paths = buildTabBarPaths(BASE);

  assert.ok(paths.fill.startsWith("M"));
  assert.ok(paths.fill.trim().endsWith("Z"), "đường nền phải khép kín");
  assert.ok(!paths.edge.includes("Z"), "viền mép trên không được khép kín");
});

// Chỉ cung tròn đồng tâm với nút mới cho vành ĐỀU quanh nút. Bán kính vòng phải
// đúng bằng bán kính nút cộng khe hở.
//
// sweep = 1 là chiều vòng qua ĐỈNH đường tròn. Đổi thành 0 là vòng qua đáy và cái
// gò lộn ngược thành cái hõm.
test("vòng là cung tròn bán kính = bán kính nút + khe hở, đi qua đỉnh", () => {
  const paths = buildTabBarPaths(BASE);
  const archRadius = BASE.buttonRadius + BASE.buttonGap;

  const halfWidth = Math.sqrt(archRadius ** 2 - BASE.buttonCenterY ** 2);
  const cx = BASE.width / 2;
  const arc = `A ${archRadius} ${archRadius} 0 1 1 ${
    Math.round((cx + halfWidth) * 100) / 100
  } 0`;

  assert.ok(paths.fill.includes(arc), `phải có "${arc}": ${paths.fill}`);
});

// Chân vòng nằm ở giao của đường tròn với mép thanh: nửa bề ngang phải là
// sqrt(r² - cy²). Sai chỗ này là vòng không khép vào mép thanh.
test("chân vòng cắt đúng mép trên của thanh", () => {
  const paths = buildTabBarPaths(BASE);
  const r = BASE.buttonRadius + BASE.buttonGap;
  const halfWidth = Math.sqrt(r * r - BASE.buttonCenterY ** 2);
  const cx = BASE.width / 2;

  assert.ok(
    paths.fill.includes(`H ${Math.round((cx - halfWidth) * 100) / 100}`),
    `chân trái phải ở ${cx - halfWidth}: ${paths.fill}`,
  );
});

// Tâm nút nằm TRÊN mép thanh thì phần vòng lên chiếm hơn nửa đường tròn.
//
// Đây là cờ dễ bỏ sót nhất: với hai chân cung và bán kính cố định, SVG có HAI
// tâm đường tròn để chọn, và large-arc quyết định lấy tâm nào. Sai cờ là SVG lấy
// tâm đối xứng ở phía bên kia mép thanh — vòng lệch khỏi tâm nút và vành quanh
// nút dày mỏng không đều.
test("tâm nút trên mép thanh thì bật large-arc", () => {
  const paths = buildTabBarPaths({ ...BASE, buttonCenterY: -4 });

  assert.match(
    paths.fill,
    /A 43 43 0 1 1 /,
    `phải bật large-arc: ${paths.fill}`,
  );
});

test("tâm nút dưới mép thanh thì tắt large-arc", () => {
  const paths = buildTabBarPaths({ ...BASE, buttonCenterY: 10 });

  assert.match(
    paths.fill,
    /A 43 43 0 0 1 /,
    `phải tắt large-arc: ${paths.fill}`,
  );
});

// Nút nổi hẳn lên trên thanh thì đường tròn không cắt mép thanh nữa — không có
// chân nào để dựng vòng, thanh phải là hình chữ nhật bo góc bình thường.
test("nút nổi hẳn trên thanh thì không vẽ vòng", () => {
  const paths = buildTabBarPaths({ ...BASE, buttonCenterY: -60 });

  assert.notEqual(paths, null);
  assert.ok(!paths.fill.includes("A 43 43"), "không được còn cung vòng");
});

test("kích thước không hợp lệ thì trả null, không ném lỗi", () => {
  for (const bad of [
    { ...BASE, width: 0 },
    { ...BASE, height: 0 },
    { ...BASE, width: -10 },
    { ...BASE, width: NaN },
    { ...BASE, height: undefined },
  ]) {
    assert.equal(buildTabBarPaths(bad), null);
  }

  assert.equal(buildTabBarPaths(), null);
  assert.equal(buildTabBarPaths({}), null);
});

test("thanh quá hẹp thì bỏ vòng, không ăn lem sang góc bo", () => {
  const paths = buildTabBarPaths({ ...BASE, width: 120 });

  assert.notEqual(paths, null);
  assert.ok(numbersIn(paths.fill).every(Number.isFinite));
  assert.ok(!paths.fill.includes("NaN"));
});

test("bo góc không vượt quá nửa chiều rộng hay chiều cao thanh", () => {
  const paths = buildTabBarPaths({
    ...BASE,
    width: 120,
    height: 20,
    cornerRadius: 200,
  });

  assert.notEqual(paths, null);
  assert.ok(!paths.fill.includes("NaN"));
});

test("mọi toạ độ sinh ra đều là số hữu hạn", () => {
  const paths = buildTabBarPaths(BASE);

  assert.ok(numbersIn(paths.fill).every(Number.isFinite));
  assert.ok(numbersIn(paths.edge).every(Number.isFinite));
});
