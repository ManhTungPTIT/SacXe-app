import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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
import { requestLocationPermissionIfNeeded } from "../services/location.service";
import { SafeAreaView } from "react-native-safe-area-context";

const SEARCH_DEBOUNCE_MS = 350;

const SearchStationInput = React.memo(({ onKeywordChange }) => {
  const [draftKeyword, setDraftKeyword] = useState("");

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onKeywordChange(draftKeyword);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [draftKeyword, onKeywordChange]);

  const handleClear = useCallback(() => {
    setDraftKeyword("");
    onKeywordChange("");
  }, [onKeywordChange]);

  return (
    <View style={styles.searchInputWrap}>
      <Ionicons name="search" size={18} color={Colors.neutralText} />
      <TextInput
        style={styles.searchInput}
        placeholder="Tìm kiếm trạm sạc theo mã hoặc địa chỉ"
        placeholderTextColor={Colors.neutralText}
        value={draftKeyword}
        onChangeText={setDraftKeyword}
        returnKeyType="search"
      />
      {draftKeyword ? (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearSearchButton}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={Colors.textPlaceholder}
          />
        </TouchableOpacity>
      ) : null}
    </View>
  );
});
const HomeScreen = ({ navigation }) => {
  const [location, setLocation] = useState(null);
  const [locationPermissionStatus, setLocationPermissionStatus] =
    useState("pending");
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState("");

  const { data: nearbyDevices } = useEChargeDeviceQuery.useFindAllDevices({
    latitude: location?.latitude,
    longitude: location?.longitude,
  });
  const { data: latestHistory } = useHistory.useGetLatestHistory();
  const searchAddress = useMemo(
    () => normalizeAddress(debouncedSearchKeyword),
    [debouncedSearchKeyword],
  );

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
    setIsResolvingLocation(true);

    try {
      // [LOCPERM-DEBUG] log tạm, gỡ sau khi tìm ra nguyên nhân gốc
      console.log("[LOCPERM] home.effect.start", Date.now());
      const permission = await requestLocationPermissionIfNeeded();
      console.log("[LOCPERM] home.effect.result", permission, Date.now());

      if (permission !== "granted") {
        setLocation(null);
        setLocationPermissionStatus(permission === "blocked" ? "blocked" : "denied");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation.coords);
      setLocationPermissionStatus("granted");
    } catch (error) {
      setLocation(null);
      setLocationPermissionStatus("error");
    } finally {
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

  const handleSearchKeywordChange = useCallback((keyword) => {
    setDebouncedSearchKeyword(keyword);
  }, []);

  const openNavigation = useCallback((lat, lng) => {
    let url = "";
    if (Platform.OS === "ios") {
      url = `${Constants.expoConfig?.extra?.apiAppleMapUrl.replace("{lat}", lat).replace("{lng}", lng)}`;
    } else {
      url = `${Constants.expoConfig?.extra?.apiGoogleMapUrl.replace("{lat}", lat).replace("{lng}", lng)}`;
    }

    Linking.openURL(url);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.page}>
        <View style={styles.keyboardView}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            <View style={styles.mapSection}>
              <View style={styles.mapHeaderSection}>
                <SearchStationInput
                  onKeywordChange={handleSearchKeywordChange}
                />
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

            {/* <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => navigation.navigate("ScanQR")}
              >
                <Ionicons name="qr-code" size={18} color={Colors.white} />
                <Text style={styles.scanButtonText}>Quét mã để sạc</Text>
              </TouchableOpacity>
            </View> */}

            <LatestHistory history={latestHistory} navigation={navigation} />
          </ScrollView>
        </View>
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
    backgroundColor: Colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  container: {
    flexGrow: 1,
    backgroundColor: Colors.white,
  },
  mapSection: {
    flex: 1,
    marginBottom: 12,
  },
  mapHeaderSection: {
    backgroundColor: Colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  searchInputWrap: {
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderGreenLight,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  clearSearchButton: {
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  mapContainer: {
    flex: 1,
    minHeight: 320,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderMuted,
  },
  quickActions: {
    paddingHorizontal: 16,
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
    color: Colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
});

export default HomeScreen;
