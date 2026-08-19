// Đường viền thanh tab dưới cùng: bo hai góc trên và dựng một vòng cung nhô lên
// ở giữa để nút quét QR ngồi lên trên.
//
// Vì sao là hình dạng của NỀN thanh chứ không phải của nút: cái vòng là phần
// thanh phình lên. Cách cũ giả lập bằng viền trắng dày quanh nút, nhìn ra hình
// tròn dán lên thanh phẳng chứ không phải liền khối với thanh.
//
// Vòng là CUNG TRÒN ĐỒNG TÂM với nút, bán kính = bán kính nút + khe hở. Chỉ hình
// này mới cho vành dày đều quanh nút. Bản đầu dựng bằng Bézier với bề rộng và độ
// sâu khai báo rời nhau, không bám theo đường tròn của nút, nên vành chỗ dày chỗ
// mỏng.
//
// Đổi lại, chỗ cung gặp mép thẳng của thanh có một góc gãy nhẹ. Vẽ nét viền với
// strokeLinejoin="round" là hết thấy.
//
// LƯU Ý CHO NGƯỜI GỌI: cung nhô lên TRÊN mép thanh, tức toạ độ y ÂM. Khung SVG
// phải được chừa khoảng thừa phía trên đúng bằng chiều cao vòng, nếu không cả
// cái vòng bị cắt sạch và thanh trông phẳng lì. Xem TAB_BAR_OVERHANG trong
// navigation/AppNavigator.js.

const isPositiveNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const toNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const round = (value) => Math.round(value * 100) / 100;

// Trả { fill, edge }:
//   fill — đường khép kín, tô màu nền thanh.
//   edge — chỉ phần mép TRÊN, để hở, dùng vẽ nét viền chạy dọc đường cong. Tách
//          ra vì stroke lên `fill` sẽ viền cả ba cạnh còn lại, kể cả cạnh đáy
//          nằm dưới vùng safe-area mà người dùng không nhìn thấy.
//
// buttonCenterY tính từ mép TRÊN của thanh: âm là nút nhô lên trên mép.
//
// Đo hỏng thì trả null: useWindowDimensions trả 0 ở frame đầu trên một số máy
// Android, và thanh tab không được ném lỗi vì một phép đo chưa sẵn sàng.
const buildTabBarPaths = (params = {}) => {
  const { width, height, cornerRadius, buttonRadius, buttonGap, buttonCenterY } =
    params;

  if (!isPositiveNumber(width) || !isPositiveNumber(height)) {
    return null;
  }

  // Bo góc không được vượt quá nửa cạnh, nếu không hai cung góc chồng lên nhau
  // và đường tự cắt chính nó.
  const R = Math.max(0, Math.min(toNumber(cornerRadius), width / 2, height));
  const cx = width / 2;

  const archRadius = Math.max(0, toNumber(buttonRadius) + toNumber(buttonGap));
  const cy = toNumber(buttonCenterY);

  // Vòng chỉ tồn tại khi đường tròn CẮT mép thanh — tâm phải nằm trong khoảng
  // một bán kính tính từ mép. Nút nổi hẳn lên trên (hoặc chìm hẳn xuống dưới)
  // thì không có chân nào để dựng vòng, thanh trở lại hình chữ nhật bo góc.
  const crossesEdge = Math.abs(cy) < archRadius;
  const halfWidth = crossesEdge
    ? Math.sqrt(archRadius * archRadius - cy * cy)
    : 0;
  // Vòng phải nằm gọn giữa hai góc bo, nếu không nó ăn lem sang góc.
  const maxHalfWidth = Math.max(cx - R, 0);
  const hasArch = halfWidth > 0 && halfWidth <= maxHalfWidth;

  // Tâm đường tròn nằm TRÊN mép thanh thì phần nhô lên chiếm hơn nửa đường tròn.
  //
  // Đây là cờ dễ bỏ sót nhất. Với hai chân cung và bán kính cố định, SVG có HAI
  // tâm đường tròn để chọn, và large-arc quyết định lấy tâm nào. Sai cờ là SVG
  // lấy tâm đối xứng ở phía bên kia mép thanh: vòng không còn đồng tâm với nút,
  // vành quanh nút dày mỏng không đều, và chiều cao vòng cũng khác số đã tính.
  const largeArc = cy < 0 ? 1 : 0;

  const arch = hasArch
    ? [
        `H ${round(cx - halfWidth)}`,
        // sweep = 1: đi từ chân trái sang chân phải theo chiều góc TĂNG, tức
        // vòng qua ĐỈNH đường tròn. sweep = 0 vòng qua đáy và cái gò lộn ngược
        // thành cái hõm khoét xuống.
        `A ${round(archRadius)} ${round(archRadius)} 0 ${largeArc} 1 ${round(
          cx + halfWidth,
        )} 0`,
      ].join(" ")
    : "";

  const topEdge = [
    `M 0 ${round(R)}`,
    R > 0 ? `A ${round(R)} ${round(R)} 0 0 1 ${round(R)} 0` : `L 0 0`,
    arch,
    `H ${round(width - R)}`,
    R > 0
      ? `A ${round(R)} ${round(R)} 0 0 1 ${round(width)} ${round(R)}`
      : `L ${round(width)} 0`,
  ]
    .filter(Boolean)
    .join(" ");

  const fill = [topEdge, `V ${round(height)}`, `H 0`, `Z`].join(" ");

  return { fill, edge: topEdge };
};

module.exports = {
  buildTabBarPaths,
};
