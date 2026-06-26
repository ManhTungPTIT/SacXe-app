import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Colors } from "../../constants/color";

export const BatteryCharging = ({ status, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === "charging") {
      animatedValue.setValue(0);
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 520,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => {
        animation.stop();
      };
    } else {
      animatedValue.setValue(0);
    }
  }, [status]);

  const isCharging = status === "charging";
  const iconColor = isCharging ? Colors.primary : Colors.inactive;
  const iconOpacity = isCharging
    ? animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.38, 1],
      })
    : 0.6;
  const iconScale = isCharging
    ? animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.88, 1.08],
      })
    : 1;

  return (
    <View style={[styles.iconContainer, style]}>
      <Animated.View
        style={[
          styles.iconPulse,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Path
            d="M9.3 1.1 3.8 8.3h3.3l-.7 6.6 5.8-7.9H8.8l.5-5.9z"
            fill={iconColor}
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    marginLeft: 4,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPulse: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BatteryCharging;
