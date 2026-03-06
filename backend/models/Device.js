const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  name: String,
  cityKey: String,
  cityDisplay: String,
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Device", deviceSchema);
