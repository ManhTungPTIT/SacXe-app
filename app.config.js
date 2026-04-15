// app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config, // kế thừa toàn bộ app.json
  extra: {
    ...(config.extra ?? {}),
    apiUrl: "https://enovo.slink.ai.vn",
    apiGoogleMapUrl: "https://www.google.com/maps/dir/?api=1&destination={lat},{lng}",
    apiAppleMapUrl: "http://maps.apple.com/?daddr={lat},{lng}&dirflg=d",
  }
});