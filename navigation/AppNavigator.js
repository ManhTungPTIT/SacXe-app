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

const Tab = createBottomTabNavigator();
const TAB_BAR_TOP_PADDING = 4;
const TAB_BAR_BOTTOM_PADDING = 0;
const TAB_BAR_ICON_SIZE = 28;
const TAB_BAR_HEIGHT = 68;
const TAB_LABELS = {
  Home: "Trang chủ",
  Charge: "Phiên sạc",
  ScanQR: "Quét QR",
  History: "Lịch sử",
  Settings: "Tài khoản",
};

const FloatingScanButton = ({ onPress, accessibilityState }) => {
  const isFocused = accessibilityState?.selected;
  const hintOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const hintAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(hintOpacity, {
          toValue: 0.45,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(hintOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1800),
        Animated.timing(hintOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(5000),
      ]),
    );

    hintAnimation.start();
    return () => hintAnimation.stop();
  }, [hintOpacity]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.scanButtonWrapper}
    >
      <Animated.View style={[styles.scanHint, { opacity: hintOpacity }]}>
        <Text style={styles.scanHintText} numberOfLines={1}>
          {"Qu\u00e9t QR \u0111\u1ec3 b\u1eaft \u0111\u1ea7u"}
        </Text>
        <Ionicons name="arrow-down" size={15} color={Colors.white} />
      </Animated.View>
      <View style={[styles.scanButton, isFocused && styles.scanButtonActive]}>
        <Ionicons name="qr-code" size={30} color={Colors.white} />
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

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Charge") {
            iconName = focused ? "flash" : "flash-outline";
          } else if (route.name === "History") {
            iconName = focused ? "time" : "time-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
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
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
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
              onPress={() =>
                navigation.navigate("ScanQR", { mode: "claim" })
              }
            />
          ),
          tabBarLabel: "",
          tabBarAccessibilityLabel: "Quet ma QR",
          unmountOnBlur: true,
        })}
      />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />

    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  scanButtonWrapper: {
    top: -18,
    justifyContent: "center",
    alignItems: "center",
  },
  scanHint: {
    position: "absolute",
    bottom: 96,
    width: 184,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
  },
  scanHintText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  scanButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    transform: [{ scale: 1.04 }],
  },
  scanButtonLabel: {
    marginTop: 2,
    color: Colors.inactive,
    fontSize: 11,
    fontWeight: "700",
  },
  scanButtonLabelActive: {
    color: Colors.primary,
  },
});

export default AppNavigator;
