import React, { useEffect, useRef, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { Colors } from "../constants/color";

import HomeScreen from "../screens/HomeScreen";
import ChargeScreen from "../screens/ChargeScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import QrScanScreen from "../screens/QrScanScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHistory } from "../queries/history.query";
import activeSessionPick from "../utils/activeSessionPick";
import tabBarNotchPath from "../utils/tabBarNotchPath";

const Tab = createBottomTabNavigator();
const TAB_BAR_TOP_PADDING = 4;
const TAB_BAR_BOTTOM_PADDING = 0;
const TAB_BAR_ICON_SIZE = 22;
const SCAN_ICON_SIZE = 35;//kích thước hình qr trong nút 
const TAB_LABEL_FONT_SIZE = 11;
const TAB_LABEL_LINE_HEIGHT = 16;
// Khoảng hở giữa icon và chữ của 4 tab thường.
const TAB_LABEL_GAP = 2;
const TAB_BAR_HEIGHT = 65;
const TAB_BAR_CORNER_RADIUS = 24;
const SCAN_BUTTON_SIZE = 57; //kích thước nút quét qr
// Khe hở giữa mép nút và mép vòng. Vì vòng là cung tròn ĐỒNG TÂM với nút nên khe
// này dày đều quanh cả nút — không có chỗ nào để chỉnh riêng, và cũng không cần.
const SCAN_BUTTON_GAP = 6;
// Nút được đẩy lên bao nhiêu so với chỗ nó nằm mặc định trong thanh. Đây là số
// DUY NHẤT cần nhích nếu muốn nút nổi cao/thấp hơn: vòng suy ra từ nó nên hai
// thứ luôn đi cùng nhau, khe hở không đổi.
const SCAN_BUTTON_LIFT = 28;
// Chỗ nút nằm khi chưa đẩy: chính giữa vùng nội dung của thanh.
const SCAN_BUTTON_BASE_CENTER_Y =
  TAB_BAR_TOP_PADDING + (TAB_BAR_HEIGHT - TAB_BAR_TOP_PADDING) / 2;
// Tâm nút so với mép TRÊN của thanh. Âm là nhô lên trên mép.
const SCAN_BUTTON_CENTER_Y = SCAN_BUTTON_BASE_CENTER_Y - SCAN_BUTTON_LIFT;
// Nét viền chạy dọc mép trên. Vẽ tại y = một nửa độ dày rồi đẩy cả nhóm xuống
// đúng bằng nửa đó, nên nét nằm trọn trong khung SVG thay vì bị cắt mất một nửa
// ở cạnh trên.
// Mép trên hàng chữ của 4 tab thường: cụm icon + chữ căn giữa vùng nội dung.
const TAB_LABEL_TOP =
  TAB_BAR_TOP_PADDING +
  (TAB_BAR_HEIGHT -
    TAB_BAR_TOP_PADDING -
    (TAB_BAR_ICON_SIZE + TAB_LABEL_GAP + TAB_LABEL_LINE_HEIGHT)) /
    2 +
  TAB_BAR_ICON_SIZE +
  TAB_LABEL_GAP;
// Nhãn nút quét đặt tuyệt đối theo khung bọc nút, nên phải quy đổi từ toạ độ
// thanh sang toạ độ khung. Suy ra chứ không gõ tay: đổi cỡ nút hay độ nâng thì
// chữ vẫn nằm ngang hàng với nhãn 4 tab kia.
const SCAN_LABEL_TOP =
  TAB_LABEL_TOP - (SCAN_BUTTON_CENTER_Y - SCAN_BUTTON_SIZE / 2);
const SCAN_LABEL_PILL_PAD_V = 1;
const SCAN_LABEL_PILL_PAD_H = 8;
// Nhịp thở của viên thuốc sau chữ "Quét QR trụ sạc": hiện dần lên, giữ nguyên,
// rồi mờ dần đi cho tới mất hẳn. Viên thuốc LUÔN nguyên kích thước — chỉ độ đục
// thay đổi, không co giãn. Lặp mãi chừng nào gợi ý còn hiển thị. Bốn số này là
// toàn bộ chỗ cần chỉnh nếu muốn đổi nhịp.
const SCAN_LABEL_PILL_FADE_IN_MS = 500;
const SCAN_LABEL_PILL_HOLD_MS = 5000;
const SCAN_LABEL_PILL_FADE_OUT_MS = 500;
// Quãng nghỉ lúc nền đã tắt hẳn — để mắt kịp thấy trạng thái chữ xanh nền trắng
// trước khi vòng lặp bắt đầu lại. Cũng là quãng chờ trước lần hiện đầu tiên.
const SCAN_LABEL_PILL_HIDDEN_MS = 1500;
const TAB_BAR_EDGE_WIDTH = 1;
// Khoảng thừa chừa phía TRÊN khung SVG. Cung vòng nằm ở toạ độ y âm, mà khung
// SVG cắt sạch mọi thứ ngoài phạm vi của nó — thiếu khoảng này là vòng biến mất
// và thanh trông phẳng lì dù đường đã vẽ đúng.
//
// Suy từ chính hình học của vòng nên không phải chỉnh tay mỗi lần đổi cỡ nút hay
// độ nâng: đỉnh vòng cách mép thanh đúng (bán kính vòng − tâm nút).
const TAB_BAR_OVERHANG = Math.ceil(
  SCAN_BUTTON_SIZE / 2 +
    SCAN_BUTTON_GAP -
    SCAN_BUTTON_CENTER_Y +
    TAB_BAR_EDGE_WIDTH,
);
const TAB_LABELS = {
  Home: "Trang chủ",
  Charge: "Phiên sạc",
  ScanQR: "Quét QR",
  History: "Lịch sử",
  Settings: "Tài khoản",
};

const { buildTabBarPaths } = tabBarNotchPath;

// Nền thanh tab: hình dạng thật nằm ở đây, không ở nút. tabBarStyle bên dưới để
// trong suốt và bỏ hết bóng/viền của nó — bóng của View là hình CHỮ NHẬT, nó sẽ
// cắt ngang cái vòng và lộ ra ngay.
const TabBarBackground = ({ height }) => {
  const { width } = useWindowDimensions();
  const paths = buildTabBarPaths({
    width,
    height,
    cornerRadius: TAB_BAR_CORNER_RADIUS,
    buttonRadius: SCAN_BUTTON_SIZE / 2,
    buttonGap: SCAN_BUTTON_GAP,
    buttonCenterY: SCAN_BUTTON_CENTER_Y,
  });

  if (!paths) {
    return null;
  }

  return (
    <Svg
      width={width}
      height={height + TAB_BAR_OVERHANG}
      style={styles.tabBarBackground}
    >
      {/* Đẩy cả hình xuống đúng bằng khoảng thừa, rồi kéo khung SVG lên lại đúng
          bằng ngần ấy (styles.tabBarBackground). Kết quả: y = 0 của đường vẫn
          trùng mép trên thanh, nhưng phần y âm của cung vòng giờ nằm trong khung
          nên không bị cắt. Nửa độ dày nét viền cộng thêm để nét không bị xén. */}
      <G translateY={TAB_BAR_OVERHANG + TAB_BAR_EDGE_WIDTH / 2}>
        <Path d={paths.fill} fill={Colors.background} />
        <Path
          d={paths.edge}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={TAB_BAR_EDGE_WIDTH}
          // Chỗ cung vòng gặp mép thẳng có một góc gãy nhẹ. Bo mối nối là hết
          // thấy, rẻ hơn nhiều so với dựng thêm hai đoạn Bézier nối tiếp tuyến.
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  );
};

const SCAN_LABEL_GRADIENT_ID = "scanLabelPillGradient";

const FloatingScanButton = ({ onPress, accessibilityState, hideHint = false }) => {
  const isFocused = accessibilityState?.selected;
  // Viên thuốc ôm sát chữ nên bề rộng chỉ biết được sau khi đo. SVG cần số thật
  // để vẽ, không nhận được phần trăm cho rx/ry.
  //
  // So sánh trước khi setState: onLayout bắn lại mỗi lần bố cục tính lại, gán
  // thẳng một object mới là vòng render vô tận.
  const [pillSize, setPillSize] = useState({ width: 0, height: 0 });
  const handlePillLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setPillSize((prev) =>
      prev.width === width && prev.height === height
        ? prev
        : { width, height },
    );
  };

  // 0 = nền đã mờ mất hẳn, chữ xanh trên nền thanh; 1 = nền hiện đủ đục, chữ
  // trắng. Một giá trị duy nhất điều khiển cả độ đục lẫn màu chữ nên hai thứ
  // không bao giờ lệch pha nhau.
  const pillProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hideHint) {
      // Gợi ý bị ẩn (đang có phiên sạc): dừng vòng lặp và trả về trạng thái đầu,
      // để lần hiện lại sau bắt đầu từ chỗ nền chưa hiện chứ không phải giữa nhịp.
      pillProgress.stopAnimation(() => pillProgress.setValue(0));
      return undefined;
    }

    // Hai quãng chờ nhét thẳng vào `delay` của chính hai chặng chạy, KHÔNG dùng
    // Animated.delay: hàm đó luôn tạo một animation chạy bằng JS (useNativeDriver
    // false cứng trong RN), xen vào giữa là mỗi nhịp lại phải nảy qua cầu JS.
    // Kiểu này cả vòng lặp nằm trọn bên native, không bận gì tới JS thread.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pillProgress, {
          toValue: 1,
          duration: SCAN_LABEL_PILL_FADE_IN_MS,
          delay: SCAN_LABEL_PILL_HIDDEN_MS,
          // Mờ dần thì đi tuyến tính là dễ chịu nhất: mắt cảm nhận độ đục gần
          // như tuyến tính, thêm gia tốc vào chỉ làm hai đầu nhịp bị giật.
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(pillProgress, {
          toValue: 0,
          duration: SCAN_LABEL_PILL_FADE_OUT_MS,
          delay: SCAN_LABEL_PILL_HOLD_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [hideHint, pillProgress]);

  // Hai lớp chữ chồng khít nhau, đổi chỗ cho nhau ở quãng nền đã đủ đậm để chữ
  // trắng nổi lên được. Đổi sớm hơn thì chữ trắng nằm trên nền xanh còn nhạt —
  // gần như trắng trên trắng, mất hút.
  const TEXT_SWAP_RANGE = [0, 0.45, 0.8, 1];
  const pillTextOpacity = pillProgress.interpolate({
    inputRange: TEXT_SWAP_RANGE,
    outputRange: [0, 0, 1, 1],
  });
  const idleTextOpacity = pillProgress.interpolate({
    inputRange: TEXT_SWAP_RANGE,
    outputRange: [1, 1, 0, 0],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.scanButtonWrapper}
    >
      {/* Nhãn đặt TRƯỚC nút: con vẽ sau nằm trên, nên nút tròn luôn đè lên
          viên thuốc. Đáy nút và mép trên viên thuốc chồng nhau vài pixel tuỳ
          SCAN_BUTTON_SIZE / SCAN_BUTTON_LIFT bạn chỉnh — thứ tự này làm chỗ
          chồng đó không bao giờ lộ ra.

          Đặt TUYỆT ĐỐI, không nằm trong dòng chảy: khung bọc căn giữa theo chiều
          dọc, một đứa con bình thường sẽ làm khung cao thêm và đẩy nút lên — mà
          vị trí nút chính là thứ vòng cung của thanh suy ra để vẽ.

          pointerEvents none: hàng này rộng hơn ô tab (left/right âm) nên nếu
          nhận chạm, nó ăn luôn cú chạm vào nhãn "Phiên sạc" và "Lịch sử" hai
          bên. Nút tròn mới là chỗ để bấm. */}
      {!hideHint && (
        <View style={styles.scanLabelRow} pointerEvents="none">
          <View style={styles.scanLabelPill} onLayout={handlePillLayout}>
            {/* Nền vẽ trong một lớp riêng chỉ để đổi độ đục: viên thuốc luôn
                nguyên kích thước, phủ kín khung, không co giãn gì. Tách lớp vì
                opacity phải chỉ ăn vào nền — đặt lên khung ngoài là chữ cũng mờ
                theo. Bề rộng vẫn do chữ (nằm trong dòng chảy) quyết định. */}
            {pillSize.width > 0 && (
              <Animated.View
                style={[StyleSheet.absoluteFill, { opacity: pillProgress }]}
              >
                <Svg
                  width={pillSize.width}
                  height={pillSize.height}
                  style={StyleSheet.absoluteFill}
                >
                  <Defs>
                    <LinearGradient
                      id={SCAN_LABEL_GRADIENT_ID}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="1"
                    >
                      <Stop offset="0" stopColor={Colors.primary} />
                      <Stop offset="1" stopColor={Colors.primaryDeep} />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    width={pillSize.width}
                    height={pillSize.height}
                    rx={pillSize.height / 2}
                    ry={pillSize.height / 2}
                    fill={`url(#${SCAN_LABEL_GRADIENT_ID})`}
                  />
                </Svg>
              </Animated.View>
            )}
            {/* Lớp chữ XANH nằm trong dòng chảy: nó là thứ đo ra kích thước
                viên thuốc. Lớp chữ TRẮNG đặt tuyệt đối chồng khít lên trên,
                cùng cỡ chữ và cùng phần đệm nên hai lớp trùng từng nét. */}
            <Animated.Text
              style={[
                styles.scanLabelText,
                styles.scanLabelTextIdle,
                { opacity: idleTextOpacity },
              ]}
              numberOfLines={1}
            >
              Quét QR trụ sạc
            </Animated.Text>
            <Animated.Text
              style={[
                styles.scanLabelText,
                styles.scanLabelTextOnPill,
                { opacity: pillTextOpacity },
              ]}
              numberOfLines={1}
            >
              Quét QR trụ sạc
            </Animated.Text>
          </View>
        </View>
      )}
      <View style={[styles.scanButton, isFocused && styles.scanButtonActive]}>
        <Ionicons
          name="qr-code-outline"
          size={SCAN_ICON_SIZE}
          color={Colors.white}
        />
      </View>
    </TouchableOpacity>
  );
};

const { getActiveSessions } = activeSessionPick;

const AppNavigator = () => {
  const inset = useSafeAreaInsets();
  const bottomSystemInset = inset.bottom;
  const { data: latestHistory } = useHistory.useGetLatestHistory();
  const { data: activeSessionsData } = useHistory.useGetActiveSessions();
  const activeSessions = getActiveSessions(activeSessionsData);
  const isChargingSessionActive = activeSessions.length > 0 || Boolean(
    latestHistory &&
      !latestHistory.totalTime &&
      !latestHistory.clientSessionStopped,
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = "home-outline";
          } else if (route.name === "Charge") {
            iconName = "flash-outline";
          } else if (route.name === "History") {
            iconName = "time-outline";
          } else if (route.name === "Settings") {
            iconName = "settings-outline";
          } else if (route.name === "ScanQR") {
            return null;
          } else if (route.name === "Feedback") {
            return null;
          }

          return (
            <Ionicons
              name={iconName}
              size={TAB_BAR_ICON_SIZE}
              color={focused ? Colors.primary : Colors.inactive}
            />
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.inactive,
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: TAB_LABEL_FONT_SIZE,
          lineHeight: TAB_LABEL_LINE_HEIGHT,
          fontWeight: "600",
          marginTop: TAB_LABEL_GAP,
          includeFontPadding: false,
        },
        headerShown: false,
        tabBarBackground: () => (
          <TabBarBackground height={TAB_BAR_HEIGHT + bottomSystemInset} />
        ),
        tabBarStyle: {
          // Trong suốt và phẳng hoàn toàn: viền, bo góc và nét mép giờ do
          // TabBarBackground vẽ. Để lại backgroundColor hay elevation ở đây là
          // lấp mất cái vòng bằng một khối chữ nhật.
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          paddingTop: TAB_BAR_TOP_PADDING,
          paddingBottom: TAB_BAR_BOTTOM_PADDING + bottomSystemInset,
          height: TAB_BAR_HEIGHT + bottomSystemInset,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Charge" component={ChargeScreen} />
      <Tab.Screen
        name="ScanQR"
        component={QrScanScreen}
        options={({ navigation }) => ({
          tabBarButton: (props) => (
            <FloatingScanButton
              {...props}
              hideHint={isChargingSessionActive}
              onPress={() =>
                navigation.navigate("ScanQR", { mode: "claim" })
              }
            />
          ),
          tabBarLabel: "",
          tabBarAccessibilityLabel: "Quet ma QR",
          // Không dùng unmountOnBlur nữa: QrScanScreen tự gỡ camera theo
          // useIsFocused() khi mất focus — mượt hơn trên Android so với để
          // Tab.Navigator huỷ nguyên màn (từng gây flash đen thoáng qua khi
          // SurfaceView của camera bị huỷ không đồng bộ với lúc đổi tab).
        })}
      />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />

    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarBackground: {
    position: "absolute",
    left: 0,
    top: -TAB_BAR_OVERHANG,
  },
  scanButtonWrapper: {
    top: -SCAN_BUTTON_LIFT,
    justifyContent: "center",
    alignItems: "center",
  },
  scanLabelRow: {
    position: "absolute",
    // Lùi lên đúng phần đệm để CHỮ vẫn ngang hàng nhãn 4 tab kia, chứ không
    // phải mép trên viên thuốc.
    top: SCAN_LABEL_TOP - SCAN_LABEL_PILL_PAD_V + 3,
    // Nới rộng hơn khung bọc (chỉ bằng bề ngang nút) để chữ dài không xuống
    // dòng. alignItems center giữ viên thuốc ôm sát chữ thay vì kéo hết bề rộng.
    left: -34,
    right: -34,
    alignItems: "center",
  },
  scanLabelPill: {
    paddingHorizontal: SCAN_LABEL_PILL_PAD_H,
    paddingVertical: SCAN_LABEL_PILL_PAD_V,
    borderRadius: 999,
    // KHÔNG đặt backgroundColor ở đây: nền phải co được về 0 rồi biến mất hẳn,
    // một lớp màu đặc dán cứng vào khung sẽ luôn lộ ra phía sau lớp đang co.
    overflow: "hidden",
  },
  scanLabelText: {
    fontSize: TAB_LABEL_FONT_SIZE,
    lineHeight: TAB_LABEL_LINE_HEIGHT,
    fontWeight: "600",
    includeFontPadding: false,
  },
  // Lúc nền đã co mất: chữ xanh trên nền trắng của thanh tab.
  scanLabelTextIdle: {
    color: Colors.primary,
  },
  // Lúc nền phủ kín: chữ trắng, ngược lại với nền xanh.
  scanLabelTextOnPill: {
    position: "absolute",
    left: SCAN_LABEL_PILL_PAD_H,
    right: SCAN_LABEL_PILL_PAD_H,
    top: SCAN_LABEL_PILL_PAD_V,
    textAlign: "center",
    color: Colors.white,
  },
  scanButton: {
    width: SCAN_BUTTON_SIZE,
    height: SCAN_BUTTON_SIZE,
    borderRadius: SCAN_BUTTON_SIZE / 2,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    // KHÔNG đặt elevation ở đây. Android đang vẽ bóng của nút thành một khối
    // vuông xám quanh nó thay vì theo hình tròn — đó là cái khung thừa nhìn
    // thấy trong ảnh. Cái vòng và khe hở đã đủ tách nút khỏi thanh; muốn có bóng
    // thật thì phải vẽ vào SVG nền, không dùng elevation.
  },
  scanButtonActive: {
    transform: [{ scale: 1.04 }],
  },
});

export default AppNavigator;
