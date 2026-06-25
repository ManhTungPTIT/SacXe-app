import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Easing } from "react-native";
import { Colors } from "../../constants/color";

export const BatteryCharging = ({ status, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === "charging") {
      animatedValue.setValue(0);
      const animation = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 3000,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: false,
        })
      );
      animation.start();
      return () => {
        animation.stop();
      };
    } else if (status === "waiting") {
      animatedValue.setValue(0);
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 0.3,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 1500,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
        ])
      );
      animation.start();
      return () => {
        animation.stop();
      };
    } else {
      // Completed or other static states - full battery, no animation
      animatedValue.setValue(1);
    }
  }, [status]);

  const fillWidth = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 16],
  });

  const fillColor = status === "charging" ? Colors.primary : Colors.inactive;
  const borderColor = status === "charging" ? Colors.primary : Colors.inactive;

  return (
    <View style={[styles.batteryContainer, style]}>
      <View style={[styles.batteryBody, { borderColor }]}>
        <Animated.View
          style={[
            styles.batteryFill,
            {
              width: fillWidth,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
      <View style={[styles.batteryTip, { backgroundColor: borderColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  batteryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
    height: 12,
  },
  batteryBody: {
    width: 22,
    height: 12,
    borderRadius: 3,
    borderWidth: 1.5,
    padding: 1,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  batteryFill: {
    height: "100%",
    borderRadius: 1,
  },
  batteryTip: {
    width: 2,
    height: 5,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
    marginLeft: 1,
  },
});

export default BatteryCharging;
