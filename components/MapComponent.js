import MapView, { Marker, Callout } from "react-native-maps";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useRef } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Colors } from "../constants/color";

// Hàm tính khoảng cách giữa 2 tọa độ (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Bán kính trái đất tính bằng km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1); // Trả về dạng xy.z km
};

// Tạm thời tắt bản đồ trên Android để tránh văng app khi API key chưa được cấu hình hoặc hết hạn
const IS_MAP_ENABLED = Platform.OS === "ios";

const MapComponent = ({
  eChargeDevices,
  location,
  openNavigation,
  isSearching = false,
  locationPermissionStatus = "pending",
  isResolvingLocation = false,
  onRequestLocationPermission,
  onOpenLocationSettings,
}) => {
  const mapRef = useRef(null);
  const listDevices = Array.isArray(
    isSearching ? eChargeDevices?.allDevices : eChargeDevices?.nearbyDevices,
  )
    ? isSearching
      ? eChargeDevices.allDevices
      : eChargeDevices.nearbyDevices
    : [];

  const goToMyLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000,
      );
    }
  };

  if (!location) {
    const isPermissionBlocked = locationPermissionStatus === "blocked";
    const isPermissionError = locationPermissionStatus === "error";

    if (isResolvingLocation || locationPermissionStatus === "pending") {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Đang lấy vị trí của bạn...</Text>
        </View>
      );
    }

    const title = isPermissionBlocked
      ? "Quyền vị trí đang tắt"
      : "Chưa có quyền vị trí";
    const description = isPermissionBlocked
      ? "Bạn đã tắt quyền vị trí cho ứng dụng. Hãy mở Cài đặt để bật lại quyền và xem trạm sạc gần bạn."
      : isPermissionError
        ? "Không lấy được vị trí hiện tại. Vui lòng kiểm tra GPS và thử lại."
        : "Ứng dụng cần quyền vị trí để hiển thị trạm sạc gần bạn trên bản đồ.";
    const primaryActionLabel = isPermissionBlocked
      ? "Mở cài đặt"
      : "Cấp quyền vị trí";
    const primaryActionHandler = isPermissionBlocked
      ? onOpenLocationSettings
      : onRequestLocationPermission;

    return (
      <View style={styles.permissionContainer}>
        <MaterialIcons name="location-off" size={46} color={Colors.primary} />
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionDescription}>{description}</Text>
        <TouchableOpacity
          style={styles.permissionPrimaryButton}
          onPress={primaryActionHandler}
        >
          <Text style={styles.permissionPrimaryButtonText}>
            {primaryActionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {IS_MAP_ENABLED ? (
        <MapView
          ref={mapRef}
          showsUserLocation={true}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {eChargeDevices?.allDevices?.map((device, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: Number(device.latitude),
                longitude: Number(device.longitude),
              }}
            >
              <Image
                source={require("../assets/charge.png")}
                style={[
                  styles.markerIcon,
                  Number(device.availableSlots) > 0
                    ? styles.markerIconAvailable
                    : styles.markerIconUnavailable,
                ]}
                resizeMode="contain"
              />
              <Callout
                tooltip
                onPress={() => openNavigation(device.latitude, device.longitude)}
              >
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{device.deviceCode}</Text>

                  <Text style={styles.calloutText}>
                    📍 Khoảng cách:{" "}
                    {calculateDistance(
                      location.latitude,
                      location.longitude,
                      Number(device.latitude),
                      Number(device.longitude),
                    )}{" "}
                    km
                  </Text>

                  {device.address && (
                    <Text style={styles.calloutText} numberOfLines={2}>
                      🏠 Địa chỉ: {device.address}
                    </Text>
                  )}

                  <Text style={styles.calloutHint}>Bấm để chỉ đường</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.mapFallback}>
          <MaterialIcons name="map" size={48} color="#9CA3AF" />
          <Text style={styles.mapFallbackText}>
            Bản đồ tạm thời không khả dụng
          </Text>
        </View>
      )}

      {/* Nút quay về vị trí của tôi */}
      {IS_MAP_ENABLED && (
        <TouchableOpacity
          style={[
            styles.myLocationButton,
            listDevices.length > 0
              ? styles.myLocationButtonWithList
              : styles.myLocationButtonWithoutList,
          ]}
          onPress={goToMyLocation}
        >
          <MaterialIcons name="my-location" size={24} color="#007BFF" />
        </TouchableOpacity>
      )}

      {/* Hiển thị danh sách thiết bị gần đây */}
      {listDevices.length > 0 && (
        <View style={styles.bottomListContainer}>
          <Text style={styles.bottomListTitle}>
            {isSearching
              ? `Kết quả tìm kiếm (${listDevices.length})`
              : `Chỗ sạc gần bạn (${listDevices.length})`}
          </Text>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.bottomListContent}
            nestedScrollEnabled={true}
          >
            {listDevices.map((device, index) => (
              <TouchableOpacity
                key={index}
                style={styles.listItemCard}
                onPress={() => {
                  mapRef.current?.animateToRegion(
                    {
                      latitude: Number(device.latitude),
                      longitude: Number(device.longitude),
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    },
                    1000,
                  );
                }}
              >
                <View style={styles.listItemInfo}>
                  <View style={styles.listItemHeader}>
                    <Image
                      source={require("../assets/charge.png")}
                      style={styles.listItemIcon}
                    />
                    <Text style={styles.listItemTitle}>
                      {device.deviceCode || device.name}
                    </Text>
                  </View>
                  <Text style={styles.listItemText} numberOfLines={1}>
                    📍{" "}
                    {calculateDistance(
                      location.latitude,
                      location.longitude,
                      Number(device.latitude),
                      Number(device.longitude),
                    )}{" "}
                    km
                  </Text>
                  <Text style={styles.listItemText} numberOfLines={2}>
                    🏠 {device.address}
                  </Text>
                  {Number(device.availableSlots) > 0 && (
                    <Text style={styles.listItemText} numberOfLines={2}>
                      Trống {device.availableSlots} chỗ
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.listNavButton,
                    Number(device?.availableSlots) > 0
                      ? styles.listNavButtonAvailable
                      : styles.listNavButtonUnavailable,
                  ]}
                  onPress={() =>
                    openNavigation(device.latitude, device.longitude)
                  }
                >
                  <Text style={[styles.listNavButtonText]}>
                    {Number(device?.availableSlots) > 0
                      ? "Chỉ đường"
                      : "Hết chỗ"}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default MapComponent;

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    color: "#6b7280",
    fontSize: 14,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fff",
  },
  permissionTitle: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "700",
    color: "#1E1E1E",
  },
  permissionDescription: {
    marginTop: 10,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  permissionPrimaryButton: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionPrimaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  permissionSecondaryButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  permissionSecondaryButtonText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  markerIcon: {
    width: 30,
    height: 30,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#333",
  },
  markerIconAvailable: {
    backgroundColor: "#fff",
  },
  markerIconUnavailable: {
    backgroundColor: "#ff1e00",
  },
  calloutContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    width: 250,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Dành cho Android
  },
  calloutTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
    marginBottom: 6,
  },
  calloutText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  calloutHint: {
    fontSize: 12,
    color: "#007BFF",
    marginTop: 8,
    fontStyle: "italic",
    textAlign: "right",
  },
  myLocationButton: {
    position: "absolute",
    left: 16,
    backgroundColor: "white",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  myLocationButtonWithList: {
    bottom: "48%",
  },
  myLocationButtonWithoutList: {
    bottom: 20,
  },
  bottomListContainer: {
    height: "45%", // Chiếm 45% màn hình ở dưới
    backgroundColor: "#F8F9FA",
    paddingTop: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  bottomListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  bottomListContent: {
    paddingBottom: 20,
  },
  listItemCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    alignItems: "center",
  },
  listItemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  listItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  listItemIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  listItemTitle: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#333",
  },
  listItemText: {
    fontSize: 13,
    color: "#555",
    marginBottom: 2,
  },
  listNavButton: {
    backgroundColor: "#007BFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  listNavButtonAvailable: {
    backgroundColor: Colors.primary,
  },
  listNavButtonUnavailable: {
    backgroundColor: "#ff1e00",
  },
  listNavButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
  mapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 20,
  },
  mapFallbackText: {
    marginTop: 8,
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "500",
  },
});
