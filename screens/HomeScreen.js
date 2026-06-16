import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Linking,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapComponent from "../components/MapComponent";
import LatestHistory from "../components/charging/LatestHistory";
import { useEChargeDeviceQuery } from "../queries/eChargeDevice.query";
import { useHistory } from "../queries/history.query";
import { Colors } from "../constants/color";
import normalizeAddress from "../utils/removeAccents";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";

const LOCATION_TIMEOUT_MS = 10000;
const LAST_KNOWN_LOCATION_MAX_AGE_MS = 5 * 60 * 1000;

const normalizeCoords = (coords) => {
  const latitude = Number(coords?.latitude);
  const longitude = Number(coords?.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
};

const getCurrentPositionWithTimeout = () => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("LOCATION_TIMEOUT"));
    }, LOCATION_TIMEOUT_MS);

    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
};

const HomeScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState("pending");
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const isRequestingLocationRef = useRef(false);

  useEffect(() => {
    const result = normalizeAddress(searchKeyword);
    setSearchAddress(result);
  }, [searchKeyword]);

  const { data: nearbyDevices } = useEChargeDeviceQuery.useFindAllDevices({
    latitude: location?.latitude,
    longitude: location?.longitude,
    enabled: Boolean(location),
  });
  const { data: latestHistory } = useHistory.useGetLatestHistory();

  const filteredDevices = useMemo(() => {
    if (!nearbyDevices) {
      return nearbyDevices;
    }

    const keyword = searchAddress.trim().toLowerCase();
    if (!keyword) {
      return nearbyDevices;
    }

    const matchDevice = (device) => {
      const searchableText = normalizeAddress(
        [
          device?.deviceCode,
          device?.name,
          device?.searchAddress,
          device?.address,
        ]
          .filter(Boolean)
          .join(" "),
      );

      return searchableText.includes(keyword);
    };

    return {
      ...nearbyDevices,
      allDevices: Array.isArray(nearbyDevices?.allDevices)
        ? nearbyDevices.allDevices.filter(matchDevice)
        : [],
      nearbyDevices: Array.isArray(nearbyDevices?.nearbyDevices)
        ? nearbyDevices.nearbyDevices.filter(matchDevice)
        : [],
    };
  }, [nearbyDevices, searchAddress]);

  const requestLocationPermission = useCallback(async () => {
    if (isRequestingLocationRef.current) {
      return;
    }

    isRequestingLocationRef.current = true;
    setIsResolvingLocation(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        setLocation(null);
        setLocationPermissionStatus(
          permission.canAskAgain ? "denied" : "blocked",
        );
        return;
      }

      const lastKnownLocation = await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_LOCATION_MAX_AGE_MS,
        requiredAccuracy: 5000,
      });
      const lastKnownCoords = normalizeCoords(lastKnownLocation?.coords);

      if (lastKnownCoords) {
        setLocation(lastKnownCoords);
        setLocationPermissionStatus("granted");
      }

      try {
        const currentLocation = await getCurrentPositionWithTimeout();
        const currentCoords = normalizeCoords(currentLocation?.coords);

        if (!currentCoords) {
          throw new Error("INVALID_LOCATION_COORDS");
        }

        setLocation(currentCoords);
      } catch (error) {
        if (!lastKnownCoords) {
          throw error;
        }
      }

      setLocationPermissionStatus("granted");
    } catch (error) {
      setLocation(null);
      setLocationPermissionStatus("error");
    } finally {
      isRequestingLocationRef.current = false;
      setIsResolvingLocation(false);
    }
  }, []);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  const openLocationSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      // Fallback to re-request permission if settings screen cannot be opened.
      requestLocationPermission();
    }
  }, [requestLocationPermission]);

  const openNavigation = (lat, lng) => {
    let url = "";
    if (Platform.OS === "ios") {
      url = `${Constants.expoConfig?.extra?.apiAppleMapUrl.replace("{lat}", lat).replace("{lng}", lng)}`;
    } else {
      url = `${Constants.expoConfig?.extra?.apiGoogleMapUrl.replace("{lat}", lat).replace("{lng}", lng)}`;
    }

    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.mapSection}>
              <View style={styles.mapHeaderSection}>
                <View style={styles.searchInputWrap}>
                  <Ionicons name="search" size={18} color="#6A6F73" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm trạm sạc theo mã hoặc địa chỉ"
                    placeholderTextColor="#6A6F73"
                    value={searchKeyword}
                    onChangeText={setSearchKeyword}
                    returnKeyType="search"
                  />
                  {searchKeyword ? (
                    <TouchableOpacity
                      onPress={() => setSearchKeyword("")}
                      style={styles.clearSearchButton}
                    >
                      <Ionicons name="close-circle" size={18} color="#7B7E82" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
              <View style={styles.mapContainer}>
                <MapComponent
                  eChargeDevices={filteredDevices}
                  location={location}
                  openNavigation={openNavigation}
                  isSearching={Boolean(searchAddress.trim())}
                  locationPermissionStatus={locationPermissionStatus}
                  isResolvingLocation={isResolvingLocation}
                  onRequestLocationPermission={requestLocationPermission}
                  onOpenLocationSettings={openLocationSettings}
                />
              </View>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => navigation.navigate("ScanQR")}
              >
                <Ionicons name="qr-code" size={18} color="#FFFFFF" />
                <Text style={styles.scanButtonText}>Quét mã để sạc</Text>
              </TouchableOpacity>
            </View>

            <LatestHistory history={latestHistory} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  page: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  mapSection: {
    marginBottom: 12,
    marginHorizontal: -16,
    overflow: "hidden",
  },
  mapHeaderSection: {
    backgroundColor: Colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  searchInputWrap: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E9DB",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1D1D1F",
    marginLeft: 8,
  },
  clearSearchButton: {
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  mapContainer: {
    height: 400,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quickActions: {
    marginTop: 16,
  },
  scanButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scanButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default HomeScreen;
