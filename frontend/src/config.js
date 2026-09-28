export const API_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://iot-sensor-backend.onrender.com"
    : "http://localhost:3000");

export const SOCKET_SERVER =
  process.env.REACT_APP_SOCKET_SERVER ||
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://iot-sensor-backend.onrender.com"
    : "http://localhost:3000");
