import "dotenv/config";

export default ({ config }) => ({
  ...config, // kế thừa toàn bộ app.json
  extra: {
    ...(config.extra ?? {}),
    apiUrl: "http://192.161.18.109:6868",
    apiGoogleMapUrl:
      "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}",
    apiAppleMapUrl: "http://maps.apple.com/?daddr={lat},{lng}&dirflg=d",
  },
});
