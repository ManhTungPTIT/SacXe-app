import React from "react";
import { View, Text, Pressable } from "react-native";

const CameraDetailComponent = ({ camera, setIsShowCameraDetail }) => {
  return (
    <View>
      <Text>Camera Detail</Text>
      <Text>Name: {camera.name}</Text>
      <Text>Location: {camera.location}</Text>
      <Pressable onPress={() => setIsShowCameraDetail(false)}>
        <Text>Close</Text>
      </Pressable>
    </View>
  );
};

export default CameraDetailComponent;
