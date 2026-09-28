const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, index: true },
  cityKey: { type: String, required: true, index: true },
  cityDisplay: { type: String, required: true },
  temperature: Number,
  humidity: Number,
  timestamp: { type: Date, default: Date.now, index: true }
});

// TTL: remove raw sensor documents after 30 days
sensorSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

// Query indexes for history and aggregation
sensorSchema.index({ deviceId: 1, timestamp: -1 });
sensorSchema.index({ cityKey: 1, timestamp: -1 });

module.exports = mongoose.model("SensorData", sensorSchema);

