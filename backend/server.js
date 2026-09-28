require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mqtt = require("mqtt");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const SensorData = require("./models/SensorData");
const Device = require("./models/Device");
const alertService = require("./services/alertService");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

/* ================= MongoDB ================= */

mongoose.connect(
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/iot_db",
  {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  }
);

mongoose.connection.once("open", () => {
  console.log("[OK] MongoDB connected");
});

mongoose.connection.on("error", (err) => {
  console.log("[ERROR] MongoDB error:", err.message);
});

/* ================= OFFLINE DETECTION ================= */

const OFFLINE_TIMEOUT = 15000;

async function checkOfflineDevices() {
  try {
    const cutoff = new Date(Date.now() - OFFLINE_TIMEOUT);

    const expiredDevices = await Device.find({
      status: "online",
      $or: [
        { lastSeen: { $lt: cutoff } },
        { lastSeen: null }
      ]
    });

    for (const device of expiredDevices) {
      device.status = "offline";
      await device.save();

      console.log(`[WARN] Device offline: ${device.deviceId}`);
      await alertService.triggerDeviceOfflineAlert(device, io);
    }
  } catch (err) {
    console.error("[ERROR] Offline detection error:", err.message);
  }
}

setInterval(checkOfflineDevices, 5000);

/* ================= MQTT ================= */

const client = mqtt.connect(
  process.env.MQTT_URL ||
  process.env.MQTT_BROKER ||
  "mqtt://localhost:1883"
);

client.on("connect", () => {
  console.log("[OK] Connected to MQTT broker");

  client.subscribe("iot/sensor/data");
});

client.on("message", async (topic, message) => {
  try {
    let data;

    /* ================= PARSE MQTT DATA ================= */

    try {
      data = JSON.parse(message.toString());
    } catch (parseErr) {
      console.error("[ERROR] MQTT parse error:", parseErr.message);
      return;
    }

    /* ================= VALIDATE SENSOR DATA ================= */

    const {
      deviceId,
      temperature,
      humidity
    } = data || {};

    if (
      !deviceId ||
      typeof deviceId !== "string" ||
      !deviceId.trim() ||
      typeof temperature !== "number" ||
      isNaN(temperature) ||
      typeof humidity !== "number" ||
      isNaN(humidity)
    ) {
      console.warn(
        "[WARN] Sensor data validation failed:",
        data
      );

      return;
    }

    const trimmedDeviceId = deviceId.trim();

    /* ================= FIND DEVICE ================= */

    let device = null;

    try {
      device = await Device.findOne({
        deviceId: trimmedDeviceId
      });
    } catch (dbErr) {
      console.warn(
        "[WARN] Error querying device:",
        dbErr.message
      );
    }

    /* ================= UPDATE DEVICE STATUS ================= */

    if (!device) {
      console.warn(
        `[WARN] Unknown device: ${trimmedDeviceId}`
      );
    } else {
      try {
        device.status = "online";
        device.lastSeen = new Date();

        await device.save();

        console.log(
          `[OK] Device online: ${device.deviceId}`
        );
      } catch (devUpdateErr) {
        console.warn(
          "[WARN] Device status update error:",
          devUpdateErr.message
        );
      }
    }

    /* ================= CITY MAP ================= */

    const cityMap = {
      Hanoi: {
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

    const rawCity =
      data.city ||
      (device ? device.name : null) ||
      "Hanoi";

    const mapping =
      cityMap[rawCity] || {
        key: rawCity,
        display: rawCity
      };

    /* ================= REALTIME PAYLOAD ================= */

    const emitPayload = {
      deviceId: trimmedDeviceId,
      cityKey: mapping.key,
      cityDisplay: mapping.display,
      temperature,
      humidity,
      timestamp: data.timestamp
        ? new Date(data.timestamp)
        : new Date()
    };

    /* ================= SAVE SENSOR DATA ================= */

    try {
      const sensorData = new SensorData({
        deviceId: emitPayload.deviceId,
        cityKey: emitPayload.cityKey,
        cityDisplay: emitPayload.cityDisplay,
        temperature: emitPayload.temperature,
        humidity: emitPayload.humidity,
        timestamp: emitPayload.timestamp
      });

      await Promise.race([
        sensorData.save(),

        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error("Save timeout")
              ),
            5000
          )
        )
      ]);

      console.log(
        "[DB] Data saved to DB:",
        emitPayload
      );
    } catch (dbError) {
      console.warn(
        "[WARN] DB save skipped (MongoDB offline):",
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

    console.log(
      "[SOCKET] Data broadcast via Socket.io"
    );

    /* ================= ALERT PROCESSING ================= */
    await alertService.checkSensorAlerts(emitPayload, io);

  } catch (error) {
    console.error(
      "[ERROR] MQTT message handling error:",
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
      sensors_history: "/api/sensors/history",
      sensors_stats: "/api/sensors/stats",
      devices: "/api/devices",
      alerts: "/api/alerts",
      alerts_active: "/api/alerts/active",
      alerts_stats: "/api/alerts/stats",
      city_data: "/api/sensor/city/:city",
      socket: "WebSocket connection available"
    }
  });
});

/* ================= ALERT REST APIs ================= */

// GET /api/alerts
app.get("/api/alerts", async (req, res) => {
  try {
    const { status, severity, type } = req.query;
    if (status && !["active", "acknowledged", "resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status parameter" });
    }
    if (severity && !["warning", "critical"].includes(severity)) {
      return res.status(400).json({ message: "Invalid severity parameter" });
    }
    if (type && !["HIGH_TEMPERATURE", "LOW_TEMPERATURE", "HIGH_HUMIDITY", "DEVICE_OFFLINE"].includes(type)) {
      return res.status(400).json({ message: "Invalid type parameter" });
    }
    const alerts = await alertService.getAlerts(req.query);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/alerts/active
app.get("/api/alerts/active", async (req, res) => {
  try {
    const alerts = await alertService.getActiveAlerts(req.query);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/alerts/stats
app.get("/api/alerts/stats", async (req, res) => {
  try {
    const stats = await alertService.getAlertStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/alerts/:id/acknowledge
app.post("/api/alerts/:id/acknowledge", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid alert ID" });
    }
    const alert = await alertService.acknowledgeAlert(id, io);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }
    res.json(alertService.formatAlertPayload(alert));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/alerts/:id/resolve
app.post("/api/alerts/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid alert ID" });
    }
    const alert = await alertService.resolveAlert(id, io);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }
    res.json(alertService.formatAlertPayload(alert));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= SENSOR HISTORY ================= */

app.get(
  "/api/sensors/history",
  async (req, res) => {
    try {
      const {
        deviceId,
        city,
        hours,
        limit
      } = req.query;

      /* ================= HOURS ================= */

      let hoursNum = 24;

      if (
        hours !== undefined &&
        hours !== ""
      ) {
        hoursNum = Number(hours);

        if (
          isNaN(hoursNum) ||
          hoursNum <= 0 ||
          hoursNum > 720
        ) {
          return res.status(400).json({
            message:
              "hours must be a positive number up to 720"
          });
        }
      }

      /* ================= LIMIT ================= */

      let limitNum = 200;

      if (
        limit !== undefined &&
        limit !== ""
      ) {
        limitNum = Number(limit);

        if (
          !Number.isInteger(limitNum) ||
          limitNum <= 0 ||
          limitNum > 1000
        ) {
          return res.status(400).json({
            message:
              "limit must be a positive integer up to 1000"
          });
        }
      }

      /* ================= QUERY ================= */

      const since = new Date(
        Date.now() -
        hoursNum * 60 * 60 * 1000
      );

      const query = {
        timestamp: {
          $gte: since
        }
      };

      if (
        deviceId &&
        typeof deviceId === "string" &&
        deviceId.trim()
      ) {
        query.deviceId =
          deviceId.trim();
      }

      if (
        city &&
        typeof city === "string" &&
        city.trim()
      ) {
        const trimmedCity =
          city.trim();

        query.$or = [
          {
            cityKey: new RegExp(
              `^${trimmedCity}$`,
              "i"
            )
          },
          {
            cityDisplay: new RegExp(
              `^${trimmedCity}$`,
              "i"
            )
          }
        ];
      }

      /* ================= GET DATA ================= */

      const rawData =
        await SensorData.find(query)
          .sort({
            timestamp: -1
          })
          .limit(limitNum)
          .lean();

      /* ================= CHRONOLOGICAL ORDER ================= */

      const chronologicalData =
        rawData
          .reverse()
          .map((item) => ({
            temperature:
              item.temperature,

            humidity:
              item.humidity,

            timestamp:
              item.timestamp
          }));

      /* ================= RESPONSE ================= */

      res.json({
        deviceId:
          deviceId ? deviceId.trim() : null,

        city:
          city
            ? city.trim()
            : null,

        range:
          `${hoursNum}h`,

        count:
          chronologicalData.length,

        data:
          chronologicalData
      });

    } catch (error) {
      console.error(
        "[ERROR] Error fetching sensor history:",
        error.message
      );

      res.status(500).json({
        message:
          "Internal server error"
      });
    }
  }
);

/* ================= SENSOR STATISTICS ================= */

app.get(
  "/api/sensors/stats",
  async (req, res) => {
    try {
      const {
        deviceId,
        city,
        hours
      } = req.query;

      /* ================= HOURS ================= */

      let hoursNum = 24;

      if (
        hours !== undefined &&
        hours !== ""
      ) {
        hoursNum = Number(hours);

        if (
          isNaN(hoursNum) ||
          hoursNum <= 0 ||
          hoursNum > 720
        ) {
          return res.status(400).json({
            message:
              "hours must be a positive number up to 720"
          });
        }
      }

      /* ================= MATCH ================= */

      const since = new Date(
        Date.now() -
        hoursNum * 60 * 60 * 1000
      );

      const matchStage = {
        timestamp: {
          $gte: since
        }
      };

      if (
        deviceId &&
        typeof deviceId === "string" &&
        deviceId.trim()
      ) {
        matchStage.deviceId =
          deviceId.trim();
      }

      if (
        city &&
        typeof city === "string" &&
        city.trim()
      ) {
        const trimmedCity =
          city.trim();

        matchStage.$or = [
          {
            cityKey: new RegExp(
              `^${trimmedCity}$`,
              "i"
            )
          },
          {
            cityDisplay: new RegExp(
              `^${trimmedCity}$`,
              "i"
            )
          }
        ];
      }

      /* ================= AGGREGATION ================= */

      const statsResult =
        await SensorData.aggregate([
          {
            $match:
              matchStage
          },

          {
            $group: {
              _id: null,

              readings: {
                $sum: 1
              },

              avgTemp: {
                $avg: "$temperature"
              },

              minTemp: {
                $min: "$temperature"
              },

              maxTemp: {
                $max: "$temperature"
              },

              avgHum: {
                $avg: "$humidity"
              },

              minHum: {
                $min: "$humidity"
              },

              maxHum: {
                $max: "$humidity"
              }
            }
          }
        ]);

      /* ================= NO DATA ================= */

      if (
        !statsResult ||
        statsResult.length === 0
      ) {
        return res.json({
          deviceId:
            deviceId
              ? deviceId.trim()
              : null,

          city:
            city
              ? city.trim()
              : null,

          range:
            `${hoursNum}h`,

          readings: 0,

          temperature: {
            average: 0,
            min: 0,
            max: 0
          },

          humidity: {
            average: 0,
            min: 0,
            max: 0
          }
        });
      }

      /* ================= FORMAT STATS ================= */

      const stats =
        statsResult[0];

      res.json({
        deviceId:
          deviceId
            ? deviceId.trim()
            : null,

        city:
          city
            ? city.trim()
            : null,

        range:
          `${hoursNum}h`,

        readings:
          stats.readings,

        temperature: {
          average:
            Number(
              (
                stats.avgTemp || 0
              ).toFixed(1)
            ),

          min:
            Number(
              (
                stats.minTemp || 0
              ).toFixed(1)
            ),

          max:
            Number(
              (
                stats.maxTemp || 0
              ).toFixed(1)
            )
        },

        humidity: {
          average:
            Number(
              (
                stats.avgHum || 0
              ).toFixed(1)
            ),

          min:
            Number(
              (
                stats.minHum || 0
              ).toFixed(1)
            ),

          max:
            Number(
              (
                stats.maxHum || 0
              ).toFixed(1)
            )
        }
      });

    } catch (error) {
      console.error(
        "[ERROR] Error fetching sensor statistics:",
        error.message
      );

      res.status(500).json({
        message:
          "Internal server error"
      });
    }
  }
);

/* ================= LATEST SENSOR BY CITY ================= */

app.get(
  "/api/sensor/city/:city",
  async (req, res) => {
    try {
      const cityParam =
        req.params.city;

      let latestData =
        await SensorData
          .findOne({
            cityKey:
              cityParam
          })
          .sort({
            timestamp: -1
          });

      if (!latestData) {
        latestData =
          await SensorData
            .findOne({
              cityDisplay:
                cityParam
            })
            .sort({
              timestamp: -1
            });
      }

      if (!latestData) {
        return res.status(404).json({
          message:
            "No data found"
        });
      }

      res.json(
        latestData
      );

    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  }
);

/* ================= ALL SENSOR DATA ================= */

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
        message:
          error.message
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

      if (
        !deviceId ||
        typeof deviceId !== "string" ||
        !deviceId.trim()
      ) {
        return res.status(400).json({
          message:
            "deviceId required"
        });
      }

      const trimmedId =
        deviceId.trim();

      let device =
        await Device.findOne({
          deviceId:
            trimmedId
        });

      /* ================= CREATE DEVICE ================= */

      if (!device) {
        device =
          new Device({
            deviceId:
              trimmedId,

            name:
              name
                ? String(name).trim()
                : trimmedId,

            cityKey:
              cityKey
                ? String(cityKey).trim()
                : "",

            cityDisplay:
              cityDisplay
                ? String(cityDisplay).trim()
                : "",

            status:
              "offline",

            lastSeen:
              null,

            registeredAt:
              new Date()
          });

        await device.save();

      } else {

        /* ================= UPDATE EXISTING DEVICE ================= */

        let updated =
          false;

        if (
          name &&
          device.name !==
          String(name).trim()
        ) {
          device.name =
            String(name).trim();

          updated = true;
        }

        if (
          cityKey &&
          device.cityKey !==
          String(cityKey).trim()
        ) {
          device.cityKey =
            String(cityKey).trim();

          updated = true;
        }

        if (
          cityDisplay &&
          device.cityDisplay !==
          String(cityDisplay).trim()
        ) {
          device.cityDisplay =
            String(cityDisplay).trim();

          updated = true;
        }

        if (updated) {
          await device.save();
        }
      }

      /* ================= RESPONSE ================= */

      const devObj =
        device.toObject();

      const isOnline =
        devObj.status === "online" &&
        devObj.lastSeen &&
        (
          Date.now() -
          new Date(
            devObj.lastSeen
          ).getTime()
        ) <
        OFFLINE_TIMEOUT;

      res.json({
        ...devObj,
        online:
          Boolean(isOnline)
      });

    } catch (err) {
      res.status(500).json({
        message:
          err.message
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

      const now =
        Date.now();

      const enhanced =
        list.map((device) => {
          const devObj =
            device.toObject();

          const isOnline =
            devObj.status ===
            "online" &&
            devObj.lastSeen &&
            (
              now -
              new Date(
                devObj.lastSeen
              ).getTime()
            ) <
            OFFLINE_TIMEOUT;

          return {
            ...devObj,

            online:
              Boolean(isOnline)
          };
        });

      res.json(
        enhanced
      );

    } catch (err) {
      res.status(500).json({
        message:
          err.message
      });
    }
  }
);

/* ================= SOCKET ================= */

io.on(
  "connection",
  (socket) => {
    console.log(
      "[SOCKET] Client connected:",
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
      `[SERVER] Server running on port ${PORT}`
    );
  }
);