import { Router } from "express";
import { SensorData } from "../models/SensorData.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

// Get all sensor data with pagination and filtering
router.get("/sensor-data", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      device_id,
      startTime,
      endTime,
      anomaliesOnly,
    } = req.query;

    // Build query
    const query = {};

    if (device_id) {
      query.device_id = device_id;
    }

    if (startTime && endTime) {
      query.timestamp = {
        $gte: new Date(startTime),
        $lte: new Date(endTime),
      };
    }

    if (anomaliesOnly === "true") {
      query.isAnomaly = true;
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()
      .exec();

    const count = await SensorData.countDocuments(query);

    res.json({
      success: true,
      data,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        perPage: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get latest readings for all devices
router.get("/sensor-data/latest", async (req, res) => {
  try {
    const latestData = await SensorData.getLatestByDevice();

    res.json({
      success: true,
      data: latestData,
      count: latestData.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get data for specific device
router.get("/sensor-data/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startTime, endTime, limit = 1000 } = req.query;

    const query = { device_id: deviceId };

    if (startTime && endTime) {
      query.timestamp = {
        $gte: new Date(startTime),
        $lte: new Date(endTime),
      };
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      device_id: deviceId,
      data,
      count: data.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get statistics
router.get("/stats", async (req, res) => {
  try {
    const { device_id } = req.query;
    const stats = await SensorData.getStats(device_id);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get list of all devices
router.get("/devices", async (req, res) => {
  try {
    const devices = await SensorData.distinct("device_id");

    res.json({
      success: true,
      devices,
      count: devices.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get alerts (anomalies and threshold violations)
router.get("/alerts", async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const alerts = await SensorData.find({
      $or: [{ isAnomaly: true }, { "alerts.0": { $exists: true } }],
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ML Prediction endpoint
router.get("/ml/predict/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;

    const response = await axios.get(
      `${process.env.ML_MODEL_URL}/predict/next-hour/${deviceId}`
    );

    res.json({
      success: true,
      prediction: response.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all predictions
router.get("/ml/predictions", async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.ML_MODEL_URL}/stats/predictions`
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
