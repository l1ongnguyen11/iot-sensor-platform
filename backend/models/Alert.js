const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  cityKey: {
    type: String,
    default: "",
    trim: true
  },
  cityDisplay: {
    type: String,
    default: "",
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ["HIGH_TEMPERATURE", "LOW_TEMPERATURE", "HIGH_HUMIDITY", "DEVICE_OFFLINE"]
  },
  severity: {
    type: String,
    required: true,
    enum: ["warning", "critical"]
  },
  message: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    default: null
  },
  threshold: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ["active", "acknowledged", "resolved"],
    default: "active"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
alertSchema.index({ deviceId: 1, type: 1, status: 1 });
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ cityKey: 1, status: 1 });
alertSchema.index({ createdAt: -1 });

// Transform output for JSON to include `id` and clean format
alertSchema.set("toJSON", {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model("Alert", alertSchema);
