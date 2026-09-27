require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const SensorData = require("./models/SensorData");
const Device = require("./models/Device");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

/* ================= MongoDB ================= */

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

mongoose.connection.once("open", () => {
  console.log("✅ MongoDB connected");
});

mongoose.connection.on("error", (err) => {
  console.log("⚠️ MongoDB error:", err.message);
});

/* ================= MQTT ================= */

const client = mqtt.connect(
  process.env.MQTT_URL || "mqtt://localhost:1883"
);

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker");
  client.subscribe("iot/sensor/data");
});

client.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    /* ================= UPDATE DEVICE STATUS ================= */

    if (data.deviceId) {
      await Device.findOneAndUpdate(
        { deviceId: data.deviceId },
        {
          $set: {
            status: "online",
            lastSeen: new Date()
          }
        },
        { new: true }
      );

      console.log(`🟢 Device online: ${data.deviceId}`);
    }

    /* ================= CHECK CITY ================= */

    if (!data.city) {
      console.log("⚠️ Data missing city:", data);
      return;
    }

    /* ================= CITY MAP ================= */

    const cityMap = {
      "Hanoi": {
        key: "Hanoi",
        display: "Ha Noi"
      },

      "Ho Chi Minh City": {
        key: "Ho Chi Minh City",
        display: "Ho Chi Minh"
      },

      "Da Nang": {
        key: "Da Nang",
        display: "Da Nang"
      }
    };

    const mapping =
      cityMap[data.city] || {
        key: data.city,
        display: data.city
      };

    /* ================= REALTIME PAYLOAD ================= */

    const emitPayload = {
      deviceId: data.deviceId,
      cityKey: mapping.key,
      cityDisplay: mapping.display,
      temperature: data.temperature,
      humidity: data.humidity,
      timestamp: data.timestamp || new Date()
    };

    /* ================= SAVE TO MONGODB ================= */

    try {
      const sensorData = new SensorData({
        deviceId: data.deviceId,
        cityKey: mapping.key,
        cityDisplay: mapping.display,
        temperature: data.temperature,
        humidity: data.humidity,
        timestamp: emitPayload.timestamp
      });

      await Promise.race([
        sensorData.save(),

        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Save timeout")),
            5000
          )
        )
      ]);

      console.log("📦 Data saved to DB:", emitPayload);

    } catch (dbError) {
      console.warn(
        "⚠️ DB save skipped (MongoDB offline):",
        dbError.message
      );
    }

    /* ================= SOCKET.IO ================= */

    io.emit(
      `sensor-${mapping.key}`,
      emitPayload
    );

    io.emit(
      "sensor-data",
      emitPayload
    );

    console.log("📡 Data broadcast via Socket.io");

  } catch (error) {
    console.error(
      "❌ MQTT parse error:",
      error.message
    );
  }
});

/* ================= ROOT ROUTE ================= */

app.get("/", (req, res) => {
  res.json({
    message: "IoT Sensor Platform API is running!",
    status: "OK",

    endpoints: {
      root: "/",
      sensors: "/api/sensors",
      devices: "/api/devices",
      city_data: "/api/sensor/city/:city",
      socket: "WebSocket connection available"
    }
  });
});

/* ================= REST API ================= */

/* Get latest sensor data by city */

app.get(
  "/api/sensor/city/:city",
  async (req, res) => {

    try {

      const cityParam = req.params.city;

      let latestData =
        await SensorData
          .findOne({
            cityKey: cityParam
          })
          .sort({
            timestamp: -1
          });

      if (!latestData) {
        latestData =
          await SensorData
            .findOne({
              cityDisplay: cityParam
            })
            .sort({
              timestamp: -1
            });
      }

      if (!latestData) {
        return res.status(404).json({
          message: "No data found"
        });
      }

      res.json(latestData);

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }
  }
);

/* Get all sensor data */

app.get(
  "/api/sensors",
  async (req, res) => {

    try {

      const data =
        await SensorData
          .find()
          .sort({
            timestamp: -1
          });

      res.json(data);

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }
  }
);

/* ================= DEVICE REGISTRATION ================= */

app.post(
  "/api/devices",
  async (req, res) => {

    try {

      const {
        deviceId,
        name,
        cityKey,
        cityDisplay
      } = req.body;

      if (!deviceId) {
        return res.status(400).json({
          message: "deviceId required"
        });
      }

      let device =
        await Device.findOne({
          deviceId
        });

      if (!device) {

        device = new Device({
          deviceId,
          name,
          cityKey,
          cityDisplay
        });

        await device.save();
      }

      res.json(device);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  }
);

/* ================= GET DEVICES ================= */

app.get(
  "/api/devices",
  async (req, res) => {

    try {

      const list =
        await Device
          .find()
          .sort({
            registeredAt: -1
          });

      const enhanced =
        await Promise.all(

          list.map(async (device) => {

            const latestSensor =
              await SensorData
                .findOne({
                  deviceId: device.deviceId
                })
                .sort({
                  timestamp: -1
                });

            const sensorLastSeen =
              latestSensor?.timestamp || null;

            /*
             * Device is considered online
             * if it sent data within 15 seconds.
             */

            const online =
              sensorLastSeen
                ? (
                    new Date() -
                    new Date(sensorLastSeen)
                  ) < 15000
                : false;

            return {
              ...device.toObject(),

              lastSeen:
                device.lastSeen ||
                sensorLastSeen,

              online
            };

          })
        );

      res.json(enhanced);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });

    }
  }
);

/* ================= SOCKET ================= */

io.on(
  "connection",
  (socket) => {

    console.log(
      "⚡ Client connected:",
      socket.id
    );

  }
);

/* ================= START SERVER ================= */

const PORT =
  process.env.PORT || 3000;

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `🚀 Server running on port ${PORT}`
    );

  }
);
