import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../constants/color";
import Feather from "@expo/vector-icons/Feather";

const BottomSidebar = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState("charge");

  const tabs = [
    // { key: "home", icon: "home", iconOutline: "home-outline" },
    { key: "charge", icon: "flash", iconOutline: "flash-outline" },
    // { key: "camera", icon: "camera", iconOutline: "camera-outline" },
    { key: "history", icon: "time", iconOutline: "time-outline" },
    { key: "settings", icon: "settings", iconOutline: "settings-outline" },
  ];

  const handlePress = (key) => {
    setActiveTab(key);
    if (onNavigate) {
      onNavigate(key);
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => handlePress(tab.key)}
        >
          <Ionicons
            name={activeTab === tab.key ? tab.icon : tab.iconOutline}
            size={26}
            color={activeTab === tab.key ? Colors.primary : Colors.inactive}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
});

export default BottomSidebar;
