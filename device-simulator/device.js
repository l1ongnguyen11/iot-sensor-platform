const mqtt = require("mqtt");
const axios = require("axios");

const API_KEY = process.env.OPENWEATHER_API_KEY;

// Backend URL
const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:3000";

const client = mqtt.connect(
  process.env.MQTT_URL || "mqtt://localhost:1883"
);

// Danh sách thiết bị
const cities = [
  {
    name: "Hanoi",
    deviceId: "sensor_hanoi"
  },
  {
    name: "Da Nang",
    deviceId: "sensor_danang"
  },
  {
    name: "Ho Chi Minh City",
    deviceId: "sensor_hcm"
  }
];

/* ================= REGISTER DEVICES ================= */

async function registerDevices() {
  for (const city of cities) {
    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/devices`,
        {
          deviceId: city.deviceId,
          name: `Weather Sensor - ${city.name}`,
          cityKey: city.name,
          cityDisplay: city.name
        }
      );

      console.log(
        `✅ Device registered: ${city.deviceId}`
      );

    } catch (error) {
      console.log(
        `❌ Failed to register ${city.deviceId}:`,
        error.response?.data?.message || error.message
      );
    }
  }
}

/* ================= MQTT CONNECT ================= */

client.on("connect", async () => {
  console.log("✅ Device connected to MQTT broker");

  // Register devices first
  await registerDevices();

  console.log("🚀 Starting sensor simulation...");

  setInterval(async () => {

    for (const city of cities) {

      try {

        const res = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${city.name}&units=metric&appid=${API_KEY}`
        );

        const data = {
          deviceId: city.deviceId,
          city: city.name,
          temperature: res.data.main.temp,
          humidity: res.data.main.humidity,
          timestamp: new Date()
        };

        client.publish(
          "iot/sensor/data",
          JSON.stringify(data)
        );

        console.log("📤 Sent:", data);

      } catch (err) {

        console.log(
          "❌ Error fetching weather:",
          err.message
        );

      }
    }

  }, 5000);
});
