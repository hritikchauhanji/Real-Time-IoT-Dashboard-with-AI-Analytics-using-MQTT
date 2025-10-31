import mongoose, { Schema } from "mongoose";

const sensorDataSchema = new Schema(
  {
    device_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    temperature: {
      type: Number,
      required: true,
      min: -50,
      max: 100,
    },
    humidity: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    isAnomaly: {
      type: Boolean,
      default: false,
    },
    alerts: [
      {
        type: {
          type: String,
          enum: ["temperature", "humidity", "anomaly"],
        },
        message: String,
        severity: {
          type: String,
          enum: ["info", "warning", "critical"],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
sensorDataSchema.index({ device_id: 1, timestamp: -1 });

// Static method to get latest readings
sensorDataSchema.statics.getLatestByDevice = async function () {
  const devices = await this.distinct("device_id");
  const latestData = [];

  for (const device of devices) {
    const latest = await this.findOne({ device_id: device })
      .sort({ timestamp: -1 })
      .lean();
    if (latest) latestData.push(latest);
  }

  return latestData;
};

// Static method to get statistics
sensorDataSchema.statics.getStats = async function (deviceId = null) {
  const match = deviceId ? { device_id: deviceId } : {};

  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$device_id",
        avgTemp: { $avg: "$temperature" },
        avgHumidity: { $avg: "$humidity" },
        maxTemp: { $max: "$temperature" },
        minTemp: { $min: "$temperature" },
        maxHumidity: { $max: "$humidity" },
        minHumidity: { $min: "$humidity" },
        count: { $sum: 1 },
        anomalyCount: {
          $sum: { $cond: ["$isAnomaly", 1, 0] },
        },
      },
    },
  ]);
};

export const SensorData = mongoose.model("SensorData", sensorDataSchema);
