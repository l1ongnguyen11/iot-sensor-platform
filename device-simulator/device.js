const mqtt = require("mqtt");
const axios = require("axios");

const MQTT_URL =
  process.env.MQTT_URL || "mqtt://localhost:1883";

const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:3000";

const OPENWEATHER_API_KEY =
  process.env.OPENWEATHER_API_KEY || "";

const mqttOptions = {};
if (process.env.MQTT_USERNAME) mqttOptions.username = process.env.MQTT_USERNAME;
if (process.env.MQTT_PASSWORD) mqttOptions.password = process.env.MQTT_PASSWORD;

const client = mqtt.connect(MQTT_URL, mqttOptions);

/* ================= DEVICES ================= */

const cities = [
  {
    name: "Hanoi",
    deviceId: "sensor_hanoi",
    cityKey: "Hanoi",
    cityDisplay: "Ha Noi"
  },
  {
    name: "Da Nang",
    deviceId: "sensor_danang",
    cityKey: "Da Nang",
    cityDisplay: "Da Nang"
  },
  {
    name: "Ho Chi Minh City",
    deviceId: "sensor_hcm",
    cityKey: "Ho Chi Minh City",
    cityDisplay: "Ho Chi Minh"
  }
];

const registeredDevices = new Set();

/* ================= REGISTER DEVICE ================= */

async function registerDevice(city) {
  try {
    await axios.post(
      `${BACKEND_URL}/api/devices`,
      {
        deviceId: city.deviceId,
        name: `Weather Sensor - ${city.name}`,
        cityKey: city.cityKey,
        cityDisplay: city.cityDisplay
      }
    );

    registeredDevices.add(
      city.deviceId
    );

    console.log(
      `✅ Registered device with backend: ${city.deviceId}`
    );

  } catch (err) {
    console.warn(
      `⚠️ Failed to register ${city.deviceId} with backend (${err.message}). Will retry...`
    );
  }
}

async function ensureDevicesRegistered() {
  for (const city of cities) {
    if (
      !registeredDevices.has(
        city.deviceId
      )
    ) {
      await registerDevice(city);
    }
  }
}

/* ================= WEATHER API ================= */

async function fetchWeatherData(cityName) {
  if (OPENWEATHER_API_KEY) {
    try {
      const response =
        await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            cityName
          )}&units=metric&appid=${OPENWEATHER_API_KEY}`
        );

      return {
        temperature:
          response.data.main.temp,

        humidity:
          response.data.main.humidity
      };

    } catch (err) {
      console.warn(
        `⚠️ Weather API error for ${cityName}: ${err.message}. Using fallback weather data.`
      );
    }
  }

  /* ================= FALLBACK DATA ================= */

  const baseTemps = {
    Hanoi: 28.5,
    "Da Nang": 31.0,
    "Ho Chi Minh City": 33.2
  };

  const baseHum = {
    Hanoi: 70,
    "Da Nang": 65,
    "Ho Chi Minh City": 75
  };

  const baseT =
    baseTemps[cityName] || 30;

  const baseH =
    baseHum[cityName] || 70;

  return {
    temperature: Number(
      (
        baseT +
        (Math.random() * 2 - 1)
      ).toFixed(1)
    ),

    humidity: Math.min(
      100,
      Math.max(
        0,
        Math.round(
          baseH +
          (Math.random() * 6 - 3)
        )
      )
    )
  };
}

/* ================= MQTT CONNECT ================= */

client.on(
  "connect",
  async () => {
    console.log(
      "✅ Device connected to MQTT broker"
    );

    await ensureDevicesRegistered();

    console.log(
      "🚀 Starting sensor simulation..."
    );

    setInterval(
      async () => {
        await ensureDevicesRegistered();

        for (const city of cities) {
          try {
            const weather =
              await fetchWeatherData(
                city.name
              );

            const data = {
              deviceId:
                city.deviceId,

              city:
                city.name,

              temperature:
                weather.temperature,

              humidity:
                weather.humidity,

              timestamp:
                new Date()
            };

            client.publish(
              "iot/sensor/data",
              JSON.stringify(data)
            );

            console.log(
              "📤 Sent:",
              data
            );

          } catch (err) {
            console.log(
              "❌ Error publishing sensor data:",
              err.message
            );
          }
        }
      },
      5000
    );
  }
);

/* ================= MQTT ERROR ================= */

client.on(
  "error",
  (err) => {
    console.error(
      "❌ MQTT Client Error:",
      err.message
    );
  }
);