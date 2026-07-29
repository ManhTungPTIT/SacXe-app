import "dotenv/config";

const googleMapsApiKey = "AIzaSyDIGUTSaUL8RY6xt_2EusWZtvZYGC_AQA4";
const normalizedGoogleMapsApiKey = googleMapsApiKey.trim();
const googleMapsApiKeyPattern = /^AIza[0-9A-Za-z_-]{35}$/;
const isAndroidMapEnabled =
  normalizedGoogleMapsApiKey.length > 0 &&
  googleMapsApiKeyPattern.test(normalizedGoogleMapsApiKey);

export default ({ config }) => ({
  ...config, // kế thừa toàn bộ app.json
 
  android:
   {
    ...(config.android ?? {}),
    // package kế thừa từ app.json: vn.ai.slink.enovo — phải khớp cặp
    // (package + SHA-1) đã đăng ký cho Google Maps API key.
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
    //apiUrl: "http://192.168.1.23:6868",
    googleMapsApiKey: normalizedGoogleMapsApiKey,
    isAndroidMapEnabled,
    apiGoogleMapUrl:
      "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}",
    apiAppleMapUrl: "http://maps.apple.com/?daddr={lat},{lng}&dirflg=d",
  },
  
});
