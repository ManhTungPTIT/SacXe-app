import "dotenv/config";

const googleMapsApiKey = "AIzaSyCe5Ft06NdRvyQKi3opWZmJYMr5LxHndb8";
const normalizedGoogleMapsApiKey = googleMapsApiKey.trim();
const googleMapsApiKeyPattern = /^AIza[0-9A-Za-z_-]{35}$/;
const isAndroidMapEnabled =
  normalizedGoogleMapsApiKey.length > 0 &&
  googleMapsApiKeyPattern.test(normalizedGoogleMapsApiKey);

export default ({ config }) => ({
  ...config, // kế thừa toàn bộ app.json
  android: {
    ...(config.android ?? {}),
    config: {
      ...(config.android?.config ?? {}),
      googleMaps: {
        ...(config.android?.config?.googleMaps ?? {}),
        apiKey: normalizedGoogleMapsApiKey,
      },
    },
  },
  extra: {
    ...(config.extra ?? {}),
    apiUrl: "https://enovo.slink.ai.vn",
    // apiUrl: "https://enovo.slink.ai.vn",
    // apiUrl: "http://192.168.1.13:6868",
    googleMapsApiKey: normalizedGoogleMapsApiKey,
    isAndroidMapEnabled,
    apiGoogleMapUrl:
      "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}",
    apiAppleMapUrl: "http://maps.apple.com/?daddr={lat},{lng}&dirflg=d",
  },
});
