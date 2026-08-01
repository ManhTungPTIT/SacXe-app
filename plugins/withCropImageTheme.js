const {
  AndroidConfig,
  withAndroidColors,
  withAndroidColorsNight,
} = require("@expo/config-plugins");

const { assignColorValue } = AndroidConfig.Colors;

// expo-image-picker mở màn hình cắt ảnh bằng ExpoCropImageActivity, activity này
// khai báo theme @style/Base.Theme.AppCompat (theme TỐI) trong manifest của thư
// viện. Mặc định thư viện lại đặt expoCropToolbarColor = #00000000 (trong suốt),
// nên toolbar lộ nền tối của theme, trong khi icon/chữ vẫn lấy bảng màu light
// (#000000) vì máy đang ở light mode -> icon đen trên nền xám đen, nút "CẮT"
// trông như bị disable và người dùng không bấm.
//
// ExpoCropImageUtils.applyPaletteToOptions đọc 5 color resource dưới đây (sau khi
// thử theme attribute cùng tên). Resource của app module ghi đè resource cùng tên
// của library module, nên chỉ cần khai báo lại ở đây là đổi được toàn bộ màu.
// Phải làm qua config plugin vì thư mục /android bị gitignore (do prebuild sinh).

// Xanh thương hiệu (#31C861 trong constants/color.js) làm chữ trên nền trắng chỉ
// đạt ~2.1:1, không đọc được. Đây là bản tối đi của cùng tông, đạt ~5.4:1 (WCAG AA).
const BRAND_GREEN_ON_WHITE = "#0B7A3C";

const LIGHT_PALETTE = {
  expoCropToolbarColor: "#FFFFFF", // đục hẳn, không để lộ nền tối của theme
  expoCropToolbarIconColor: "#1D1D1F", // Colors.textPrimary
  expoCropToolbarActionTextColor: BRAND_GREEN_ON_WHITE, // "CẮT" nhìn ra là nút bấm
  expoCropBackButtonIconColor: "#1D1D1F",
  expoCropBackgroundColor: "#FFFFFF",
};

// App khoá userInterfaceStyle: "light", nhưng activity cắt ảnh đọc uiMode của hệ
// thống chứ không theo app, nên máy để dark mode vẫn rơi vào values-night. Ở đây
// giữ nền tối (nếu ép trắng thì applyWindowTheming vẫn set status bar icon màu
// trắng theo isNight -> đồng hồ/pin biến mất) nhưng đảo icon sang trắng cho tương phản.
const NIGHT_PALETTE = {
  expoCropToolbarColor: "#1D1D1F",
  expoCropToolbarIconColor: "#FFFFFF",
  expoCropToolbarActionTextColor: "#4FD983", // xanh sáng hơn để nổi trên nền tối
  expoCropBackButtonIconColor: "#FFFFFF",
  expoCropBackgroundColor: "#000000",
};

const applyPalette = (colors, palette) =>
  Object.entries(palette).reduce(
    (acc, [name, value]) => assignColorValue(acc, { name, value }),
    colors,
  );

const withCropImageTheme = (config) => {
  config = withAndroidColors(config, (cfg) => {
    cfg.modResults = applyPalette(cfg.modResults, LIGHT_PALETTE);
    return cfg;
  });

  config = withAndroidColorsNight(config, (cfg) => {
    cfg.modResults = applyPalette(cfg.modResults, NIGHT_PALETTE);
    return cfg;
  });

  return config;
};

module.exports = withCropImageTheme;
