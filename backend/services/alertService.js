const Alert = require("../models/Alert");

// Read configuration from environment variables with fallbacks
const ALERT_HIGH_TEMPERATURE = process.env.ALERT_HIGH_TEMPERATURE !== undefined 
  ? Number(process.env.ALERT_HIGH_TEMPERATURE) : 40;
const ALERT_LOW_TEMPERATURE = process.env.ALERT_LOW_TEMPERATURE !== undefined 
  ? Number(process.env.ALERT_LOW_TEMPERATURE) : 0;
const ALERT_HIGH_HUMIDITY = process.env.ALERT_HIGH_HUMIDITY !== undefined 
  ? Number(process.env.ALERT_HIGH_HUMIDITY) : 85;
const DEVICE_OFFLINE_TIMEOUT = process.env.DEVICE_OFFLINE_TIMEOUT !== undefined 
  ? Number(process.env.DEVICE_OFFLINE_TIMEOUT) : 15000;

function formatAlertPayload(alert) {
  const obj = alert.toObject ? alert.toObject() : alert;
  return {
    id: obj._id ? obj._id.toString() : obj.id,
    deviceId: obj.deviceId,
    cityKey: obj.cityKey || "",
    cityDisplay: obj.cityDisplay || "",
    type: obj.type,
    severity: obj.severity,
    message: obj.message,
    value: obj.value,
    threshold: obj.threshold,
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
}

/**
 * Process sensor data against thresholds and auto-resolve/create alerts
 */
async function checkSensorAlerts(sensorData, io) {
  try {
    const { deviceId, cityKey, cityDisplay, temperature, humidity } = sensorData;
    if (!deviceId) return;

    // 1. Resolve DEVICE_OFFLINE alert if device sends data again
    try {
      const offlineAlert = await Alert.findOne({
        deviceId,
        type: "DEVICE_OFFLINE",
        status: { $in: ["active", "acknowledged"] }
      });
      if (offlineAlert) {
        offlineAlert.status = "resolved";
        offlineAlert.updatedAt = new Date();
        await offlineAlert.save();
        const payload = formatAlertPayload(offlineAlert);
        if (io) io.emit("alert:updated", payload);
        console.log(`[RESOLVED] Auto-resolved DEVICE_OFFLINE alert for ${deviceId}`);
      }
    } catch (err) {
      console.error("[ERROR] Error resolving offline alert:", err.message);
    }

    // 2. High Temperature Alert
    if (typeof temperature === "number" && !isNaN(temperature)) {
      if (temperature > ALERT_HIGH_TEMPERATURE) {
        const existing = await Alert.findOne({
          deviceId,
          type: "HIGH_TEMPERATURE",
          status: { $in: ["active", "acknowledged"] }
        });
        if (existing) {
          existing.value = temperature;
          existing.updatedAt = new Date();
          await existing.save();
          if (io) io.emit("alert:updated", formatAlertPayload(existing));
        } else {
          const newAlert = new Alert({
            deviceId,
            cityKey: cityKey || "",
            cityDisplay: cityDisplay || "",
            type: "HIGH_TEMPERATURE",
            severity: "critical",
            message: "High temperature detected",
            value: temperature,
            threshold: ALERT_HIGH_TEMPERATURE,
            status: "active"
          });
          await newAlert.save();
          if (io) io.emit("alert:new", formatAlertPayload(newAlert));
          console.log(`[ALERT] HIGH_TEMPERATURE alert triggered for ${deviceId}: ${temperature}°C`);
        }
      } else {
        // Auto-resolve HIGH_TEMPERATURE if temperature <= threshold
        const activeAlert = await Alert.findOne({
          deviceId,
          type: "HIGH_TEMPERATURE",
          status: { $in: ["active", "acknowledged"] }
        });
        if (activeAlert) {
          activeAlert.status = "resolved";
          activeAlert.updatedAt = new Date();
          await activeAlert.save();
          if (io) io.emit("alert:updated", formatAlertPayload(activeAlert));
          console.log(`[RESOLVED] Auto-resolved HIGH_TEMPERATURE alert for ${deviceId}`);
        }
      }

      // 3. Low Temperature Alert
      if (temperature < ALERT_LOW_TEMPERATURE) {
        const existing = await Alert.findOne({
          deviceId,
          type: "LOW_TEMPERATURE",
          status: { $in: ["active", "acknowledged"] }
        });
        if (existing) {
          existing.value = temperature;
          existing.updatedAt = new Date();
          await existing.save();
          if (io) io.emit("alert:updated", formatAlertPayload(existing));
        } else {
          const newAlert = new Alert({
            deviceId,
            cityKey: cityKey || "",
            cityDisplay: cityDisplay || "",
            type: "LOW_TEMPERATURE",
            severity: "warning",
            message: "Low temperature detected",
            value: temperature,
            threshold: ALERT_LOW_TEMPERATURE,
            status: "active"
          });
          await newAlert.save();
          if (io) io.emit("alert:new", formatAlertPayload(newAlert));
          console.log(`[ALERT] LOW_TEMPERATURE alert triggered for ${deviceId}: ${temperature}°C`);
        }
      } else {
        // Auto-resolve LOW_TEMPERATURE if temperature >= threshold
        const activeAlert = await Alert.findOne({
          deviceId,
          type: "LOW_TEMPERATURE",
          status: { $in: ["active", "acknowledged"] }
        });
        if (activeAlert) {
          activeAlert.status = "resolved";
          activeAlert.updatedAt = new Date();
          await activeAlert.save();
          if (io) io.emit("alert:updated", formatAlertPayload(activeAlert));
          console.log(`[RESOLVED] Auto-resolved LOW_TEMPERATURE alert for ${deviceId}`);
        }
      }
    }

    // 4. High Humidity Alert
    if (typeof humidity === "number" && !isNaN(humidity)) {
      if (humidity > ALERT_HIGH_HUMIDITY) {
        const existing = await Alert.findOne({
          deviceId,
          type: "HIGH_HUMIDITY",
          status: { $in: ["active", "acknowledged"] }
        });
        if (existing) {
          existing.value = humidity;
          existing.updatedAt = new Date();
          await existing.save();
          if (io) io.emit("alert:updated", formatAlertPayload(existing));
        } else {
          const newAlert = new Alert({
            deviceId,
            cityKey: cityKey || "",
            cityDisplay: cityDisplay || "",
            type: "HIGH_HUMIDITY",
            severity: "warning",
            message: "High humidity detected",
            value: humidity,
            threshold: ALERT_HIGH_HUMIDITY,
            status: "active"
          });
          await newAlert.save();
          if (io) io.emit("alert:new", formatAlertPayload(newAlert));
          console.log(`[ALERT] HIGH_HUMIDITY alert triggered for ${deviceId}: ${humidity}%`);
        }
      } else {
        // Auto-resolve HIGH_HUMIDITY if humidity <= threshold
        const activeAlert = await Alert.findOne({
          deviceId,
          type: "HIGH_HUMIDITY",
          status: { $in: ["active", "acknowledged"] }
        });
        if (activeAlert) {
          activeAlert.status = "resolved";
          activeAlert.updatedAt = new Date();
          await activeAlert.save();
          if (io) io.emit("alert:updated", formatAlertPayload(activeAlert));
          console.log(`[RESOLVED] Auto-resolved HIGH_HUMIDITY alert for ${deviceId}`);
        }
      }
    }

  } catch (err) {
    console.error("[ERROR] Error checking sensor alerts:", err.message);
  }
}

/**
 * Trigger DEVICE_OFFLINE alert when device goes offline
 */
async function triggerDeviceOfflineAlert(device, io) {
  try {
    const { deviceId, cityKey, cityDisplay } = device;
    if (!deviceId) return;

    const existing = await Alert.findOne({
      deviceId,
      type: "DEVICE_OFFLINE",
      status: { $in: ["active", "acknowledged"] }
    });

    if (!existing) {
      const newAlert = new Alert({
        deviceId,
        cityKey: cityKey || "",
        cityDisplay: cityDisplay || "",
        type: "DEVICE_OFFLINE",
        severity: "critical",
        message: "Device is offline",
        value: null,
        threshold: DEVICE_OFFLINE_TIMEOUT,
        status: "active"
      });
      await newAlert.save();
      if (io) io.emit("alert:new", formatAlertPayload(newAlert));
      console.log(`[ALERT] DEVICE_OFFLINE alert triggered for ${deviceId}`);
    }
  } catch (err) {
    console.error("[ERROR] Error triggering offline alert:", err.message);
  }
}

/**
 * Acknowledge alert by ID
 */
async function acknowledgeAlert(alertId, io) {
  try {
    const alert = await Alert.findById(alertId);
    if (!alert) return null;

    if (alert.status === "active") {
      alert.status = "acknowledged";
      alert.updatedAt = new Date();
      await alert.save();
      const payload = formatAlertPayload(alert);
      if (io) io.emit("alert:updated", payload);
    }
    return alert;
  } catch (err) {
    console.error("[ERROR] Error acknowledging alert:", err.message);
    throw err;
  }
}

/**
 * Resolve alert by ID
 */
async function resolveAlert(alertId, io) {
  try {
    const alert = await Alert.findById(alertId);
    if (!alert) return null;

    if (alert.status !== "resolved") {
      alert.status = "resolved";
      alert.updatedAt = new Date();
      await alert.save();
      const payload = formatAlertPayload(alert);
      if (io) io.emit("alert:updated", payload);
    }
    return alert;
  } catch (err) {
    console.error("[ERROR] Error resolving alert:", err.message);
    throw err;
  }
}

/**
 * Get alerts matching filters
 */
async function getAlerts({ deviceId, city, status, type, severity, limit }) {
  const query = {};

  if (deviceId && typeof deviceId === "string" && deviceId.trim()) {
    query.deviceId = deviceId.trim();
  }
  if (city && typeof city === "string" && city.trim()) {
    const trimmedCity = city.trim();
    query.$or = [
      { cityKey: new RegExp(`^${trimmedCity}$`, "i") },
      { cityDisplay: new RegExp(`^${trimmedCity}$`, "i") }
    ];
  }
  if (status && ["active", "acknowledged", "resolved"].includes(status)) {
    query.status = status;
  }
  if (type && ["HIGH_TEMPERATURE", "LOW_TEMPERATURE", "HIGH_HUMIDITY", "DEVICE_OFFLINE"].includes(type)) {
    query.type = type;
  }
  if (severity && ["warning", "critical"].includes(severity)) {
    query.severity = severity;
  }

  let limitNum = 50;
  if (limit !== undefined && limit !== "") {
    const parsed = parseInt(limit, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      limitNum = Math.min(parsed, 200);
    }
  }

  const list = await Alert.find(query)
    .sort({ createdAt: -1 })
    .limit(limitNum);

  return list.map(formatAlertPayload);
}

/**
 * Get active and acknowledged alerts only
 */
async function getActiveAlerts({ deviceId, city, severity, type, limit }) {
  const query = {
    status: { $in: ["active", "acknowledged"] }
  };

  if (deviceId && typeof deviceId === "string" && deviceId.trim()) {
    query.deviceId = deviceId.trim();
  }
  if (city && typeof city === "string" && city.trim()) {
    const trimmedCity = city.trim();
    query.$or = [
      { cityKey: new RegExp(`^${trimmedCity}$`, "i") },
      { cityDisplay: new RegExp(`^${trimmedCity}$`, "i") }
    ];
  }
  if (severity && ["warning", "critical"].includes(severity)) {
    query.severity = severity;
  }
  if (type && ["HIGH_TEMPERATURE", "LOW_TEMPERATURE", "HIGH_HUMIDITY", "DEVICE_OFFLINE"].includes(type)) {
    query.type = type;
  }

  let limitNum = 50;
  if (limit !== undefined && limit !== "") {
    const parsed = parseInt(limit, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      limitNum = Math.min(parsed, 200);
    }
  }

  const list = await Alert.find(query)
    .sort({ createdAt: -1 })
    .limit(limitNum);

  return list.map(formatAlertPayload);
}

/**
 * Get alert summary stats
 */
async function getAlertStats() {
  const [statusCounts, severityCounts, totalCount] = await Promise.all([
    Alert.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Alert.aggregate([
      { $match: { status: { $in: ["active", "acknowledged"] } } },
      { $group: { _id: "$severity", count: { $sum: 1 } } }
    ]),
    Alert.countDocuments()
  ]);

  const stats = {
    active: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
    total: totalCount
  };

  statusCounts.forEach((item) => {
    if (stats[item._id] !== undefined) {
      stats[item._id] = item.count;
    }
  });

  severityCounts.forEach((item) => {
    if (stats[item._id] !== undefined) {
      stats[item._id] = item.count;
    }
  });

  return stats;
}

module.exports = {
  checkSensorAlerts,
  triggerDeviceOfflineAlert,
  acknowledgeAlert,
  resolveAlert,
  getAlerts,
  getActiveAlerts,
  getAlertStats,
  formatAlertPayload,
  ALERT_HIGH_TEMPERATURE,
  ALERT_LOW_TEMPERATURE,
  ALERT_HIGH_HUMIDITY,
  DEVICE_OFFLINE_TIMEOUT
};
