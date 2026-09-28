const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  name: {
    type: String,
    default: "Unnamed Device",
    trim: true
  },

  cityKey: {
    type: String,
    default: ""
  },

  cityDisplay: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: ["online", "offline"],
    default: "offline"
  },

  lastSeen: {
    type: Date,
    default: null
  },

  registeredAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Device", deviceSchema);