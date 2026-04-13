import React from "react";
import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Colors } from "../constants/color";

import HomeScreen from "../screens/HomeScreen";
import ChargeScreen from "../screens/ChargeScreen";
import HistoryScreen from "../screens/HistoryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import QrScanScreen from "../screens/QrScanScreen";
import FeedbackScreen from "../screens/FeedbackScreen";

const Tab = createBottomTabNavigator();

const FloatingScanButton = ({ onPress, accessibilityState }) => {
  const isFocused = accessibilityState?.selected;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.scanButtonWrapper}
    >
      <View style={[styles.scanButton, isFocused && styles.scanButtonActive]}>
        <Ionicons name="qr-code" size={30} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const FloatingFeedbackButton = ({ onPress, isActive }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.feedbackButtonWrapper}
    >
      <View
        style={[styles.feedbackButton, isActive && styles.feedbackButtonActive]}
      >
        <Ionicons
          name={isActive ? "help" : "help-outline"}
          size={24}
          color={isActive ? "#FFFFFF" : Colors.primary}
        />
      </View>
    </TouchableOpacity>
  );
};

const AppNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => {
        const activeRouteName = props.state.routes[props.state.index]?.name;

        return (
          <View style={styles.tabBarWrapper}>
            <BottomTabBar {...props} />
            <FloatingFeedbackButton
              isActive={activeRouteName === "Feedback"}
              onPress={() => props.navigation.navigate("Feedback")}
            />
          </View>
        );
      }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size }) => {
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
              size={size}
              color={focused ? Colors.primary : Colors.inactive}
            />
          );
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.inactive,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          paddingBottom: 10,
          paddingTop: 8,
          height: 72,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Charge" component={ChargeScreen} />
      <Tab.Screen
        name="ScanQR"
        component={QrScanScreen}
        options={{
          tabBarButton: (props) => <FloatingScanButton {...props} />,
          tabBarLabel: "",
          tabBarAccessibilityLabel: "Quet ma QR",
          unmountOnBlur: true,
        }}
      />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: "none" },
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "relative",
  },
  scanButtonWrapper: {
    top: -24,
    justifyContent: "center",
    alignItems: "center",
  },
  scanButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 8,
  },
  scanButtonActive: {
    transform: [{ scale: 1.04 }],
  },
  feedbackButtonWrapper: {
    position: "absolute",
    right: 16,
    top: -65,
  },
  feedbackButton: {
    color: Colors.primary,
    width: 50,
    height: 50,
    borderRadius: 28,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  feedbackButtonActive: {
    backgroundColor: Colors.primary,
  },
});

export default AppNavigator;
