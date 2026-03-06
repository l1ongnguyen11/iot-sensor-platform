const mongoose = require("mongoose");

const sensorSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  cityKey: { type: String, required: true },
  cityDisplay: { type: String, required: true },
  temperature: Number,
  humidity: Number,
  timestamp: { type: Date, default: Date.now }
});

// TTL: remove raw sensor documents after 30 days
sensorSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("SensorData", sensorSchema);
