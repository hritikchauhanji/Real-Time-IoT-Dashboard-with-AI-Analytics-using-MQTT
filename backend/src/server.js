import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { MQTTService } from "./services/mqttService.js";
import apiRoutes from "./routes/api.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
connectDB();

// Initialize MQTT Service
const mqttService = new MQTTService(io);
mqttService.connect();

// API Routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (_, res) => {
  const mqttStatus = mqttService.getStatus();
  res.json({
    status: "OK",
    timestamp: new Date(),
    mqtt: mqttStatus,
    database: "connected",
  });
});

const isProd = process.env.NODE_ENV === "production";
const wsProtocol = isProd ? "wss" : "ws";
const wsHost =
  process.env.BACKEND_WS_URL?.replace(/^https?/, wsProtocol) ||
  `${wsProtocol}://localhost:${process.env.PORT || 5000}`;

// Root endpoint
app.get("/", (_, res) => {
  res.json({
    message: "IoT Dashboard Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api",
      websocket: wsHost,
    },
  });
});

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`Client connected to WebSocket: ${socket.id}`);

  // Send current MQTT status to new client
  socket.emit("mqtt-status", mqttService.getStatus());

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  // Handle client requests
  socket.on("request-latest", async () => {
    try {
      const SensorData = require("./models/SensorData");
      const latest = await SensorData.getLatestByDevice();
      socket.emit("latest-data", latest);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });
});

// Error handling middleware
app.use((err, _, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

// Handle 404
app.use((_, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down gracefully...");
  mqttService.disconnect();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("\n" + "=".repeat(70));
  console.log("IoT Dashboard Backend Server");
  console.log("=".repeat(70));
  console.log(`HTTP Server: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
  console.log(`API Endpoints: http://localhost:${PORT}/api`);
  console.log(`Health Check: http://localhost:${PORT}/health`);
  console.log("=".repeat(70) + "\n");
});
