import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/color";

import HomeScreen from "../screens/HomeScreen";
import ChargeScreen from "../screens/ChargeScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import QrScanScreen from "../screens/QrScanScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHistory } from "../queries/history.query";

const Tab = createBottomTabNavigator();
const TAB_BAR_TOP_PADDING = 4;
const TAB_BAR_BOTTOM_PADDING = 0;
const TAB_BAR_ICON_SIZE = 22;
const SCAN_ICON_SIZE = 24;
const TAB_LABEL_FONT_SIZE = 11;
const TAB_LABEL_LINE_HEIGHT = 14;
const TAB_BAR_HEIGHT = 68;
const TAB_LABELS = {
  Home: "Trang chủ",
  Charge: "Phiên sạc",
  ScanQR: "Quét QR",
  History: "Lịch sử",
  Settings: "Tài khoản",
};

const FloatingScanButton = ({ onPress, accessibilityState, hideHint = false }) => {
  const isFocused = accessibilityState?.selected;
  const hintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hideHint) {
      hintOpacity.setValue(0);
      return undefined;
    }

    const hintAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(hintOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.delay(5000),
      ]),
    );

    hintAnimation.start();
    return () => hintAnimation.stop();
  }, [hideHint, hintOpacity]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.scanButtonWrapper}
    >
      {/* renderToHardwareTextureAndroid: scanHintBubble bên trong có
          elevation (đổ bóng Android) — khi opacity của View cha này được
          animate (useNativeDriver), lớp bóng đổ render tách rời khỏi nội
          dung nên xuất hiện một vệt đen ngay trước lúc hiện/ẩn. Prop này ép
          cả nội dung lẫn bóng đổ dựng thành 1 texture duy nhất để cùng mờ
          dần theo opacity, hết vệt đen. */}
      {!hideHint && (
        <Animated.View
          style={[styles.scanHint, { opacity: hintOpacity }]}
          renderToHardwareTextureAndroid
        >
        <View style={styles.scanHintBubble}>
          <Text style={styles.scanHintText} numberOfLines={1}>
            {"Qu\u00e9t QR trên trụ sạc"}
          </Text>
        </View>
        <View style={styles.scanHintTailBorder} />
        <View style={styles.scanHintTailFill} />
        </Animated.View>
      )}
      <View style={[styles.scanButton, isFocused && styles.scanButtonActive]}>
        <Ionicons
          name="qr-code-outline"
          size={SCAN_ICON_SIZE}
          color={Colors.white}
        />
      </View>
      <Text
        style={[
          styles.scanButtonLabel,
          isFocused && styles.scanButtonLabelActive,
        ]}
      >
        Quét QR
      </Text>
    </TouchableOpacity>
  );
};

const AppNavigator = () => {
  const inset = useSafeAreaInsets();
  const bottomSystemInset = inset.bottom;
  const { data: latestHistory } = useHistory.useGetLatestHistory();
  const isChargingSessionActive = Boolean(
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
          marginTop: 2,
          includeFontPadding: false,
        },
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.primary,
          borderBottomColor: Colors.primary,
          borderTopWidth: 1.5,
          paddingTop: TAB_BAR_TOP_PADDING,
          paddingBottom: TAB_BAR_BOTTOM_PADDING + bottomSystemInset,
          height: TAB_BAR_HEIGHT + bottomSystemInset,
          shadowColor: Colors.black,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 4,
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
  scanButtonWrapper: {
    top: -24,
    justifyContent: "center",
    alignItems: "center",
  },
  scanHint: {
    position: "absolute",
    bottom: 80,
    width: 170,
    height: 49,
    alignItems: "center",
  },
  scanHintBubble: {
    width: "100%",
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
  },
  scanHintTailBorder: {
    position: "absolute",
    top: 32,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 15,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.primary,
  },
  scanHintTailFill: {
    position: "absolute",
    top: 32,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 11,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.white,
  },
  scanHintText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  scanButton: {
    width: 68,
    height: 68,
    borderRadius: 36,
    transform: [{ translateY: -6 }],
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 8,
  },
  scanButtonActive: {
    transform: [{ translateY: -6 }, { scale: 1.04 }],
  },
  scanButtonLabel: {
    marginTop: -4,
    color: Colors.inactive,
    fontSize: TAB_LABEL_FONT_SIZE,
    lineHeight: TAB_LABEL_LINE_HEIGHT,
    fontWeight: "600",
    includeFontPadding: false,
  },
  scanButtonLabelActive: {
    color: Colors.primary,
  },
});

export default AppNavigator;
