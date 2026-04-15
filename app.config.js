// app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config, // kế thừa toàn bộ app.json
  extra: {
    ...(config.extra ?? {}),
    apiUrl: process.env.API_URL,
    apiGoogleMapUrl: process.env.API_GOOGLE_MAP_URL,
    apiAppleMapUrl: process.env.API_APPLE_MAP_URL,
  }
});