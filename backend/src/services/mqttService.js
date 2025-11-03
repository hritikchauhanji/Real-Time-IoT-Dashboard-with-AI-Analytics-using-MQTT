import mqtt from "mqtt";
import { SensorData } from "../models/SensorData.js";

class MQTTService {
  constructor(io) {
    this.io = io;
    this.client = null;
    this.isConnected = false;
    this.messageCount = 0;
  }

  connect() {
    const options = {
      clientId: process.env.MQTT_CLIENT_ID || "backend_subscriber",
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      protocol: "mqtt",
    };

    console.log(`\nConnecting to MQTT Broker: ${process.env.MQTT_BROKER}`);
    this.client = mqtt.connect(process.env.MQTT_BROKER, options);

    this.client.on("connect", () => {
      this.isConnected = true;
      console.log(`Connected to MQTT Broker`);

      this.client.subscribe(process.env.MQTT_TOPIC, { qos: 1 }, (err) => {
        if (!err) {
          console.log(`Subscribed to topic: ${process.env.MQTT_TOPIC}`);
          console.log(`Listening for sensor data...\n`);
        } else {
          console.error(`Subscription error: ${err.message}`);
        }
      });
    });

    this.client.on("message", async (topic, message) => {
      try {
        this.messageCount++;
        const data = JSON.parse(message.toString());

        console.log(
          `📥 [${this.messageCount}] Received from ${data.device_id}:`,
          `Temp: ${data.temperature}°C, Humidity: ${data.humidity}%`
        );

        // Check for threshold alerts
        const alerts = this.checkThresholds(data);

        // Detect anomalies (simple spike detection)
        const isAnomaly = await this.detectAnomaly(data);

        if (isAnomaly) {
          alerts.push({
            type: "anomaly",
            message: "Unusual sensor reading detected",
            severity: "warning",
          });
        }

        // Save to MongoDB
        const sensorData = new SensorData({
          device_id: data.device_id,
          temperature: data.temperature,
          humidity: data.humidity,
          timestamp: new Date(data.timestamp),
          isAnomaly: isAnomaly,
          alerts: alerts,
        });

        await sensorData.save();

        // Emit to WebSocket clients in real-time
        const payload = {
          ...data,
          alerts,
          isAnomaly,
          _id: sensorData._id,
        };

        this.io.emit("sensor-update", payload);

        // Emit alerts if any
        if (alerts.length > 0) {
          console.log(
            `⚠️  ALERT for ${data.device_id}:`,
            alerts.map((a) => a.message).join(", ")
          );
          this.io.emit("alert", {
            device_id: data.device_id,
            alerts,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error processing MQTT message:", error.message);
      }
    });

    this.client.on("error", (error) => {
      console.error("MQTT Error:", error.message);
      this.isConnected = false;
    });

    this.client.on("close", () => {
      console.log("MQTT Connection closed");
      this.isConnected = false;
    });

    this.client.on("reconnect", () => {
      console.log("Reconnecting to MQTT Broker...");
    });
  }

  checkThresholds(data) {
    const alerts = [];
    const tempThreshold = parseFloat(process.env.TEMP_THRESHOLD);
    const humidityThreshold = parseFloat(process.env.HUMIDITY_THRESHOLD);

    if (data.temperature > tempThreshold) {
      alerts.push({
        type: "temperature",
        message: `High temperature: ${data.temperature}°C (threshold: ${tempThreshold}°C)`,
        severity: "warning",
      });
    }

    if (data.temperature > tempThreshold + 5) {
      alerts.push({
        type: "temperature",
        message: `Critical temperature: ${data.temperature}°C`,
        severity: "critical",
      });
    }

    if (data.humidity > humidityThreshold) {
      alerts.push({
        type: "humidity",
        message: `High humidity: ${data.humidity}% (threshold: ${humidityThreshold}%)`,
        severity: "warning",
      });
    }

    return alerts;
  }

  async detectAnomaly(data) {
    try {
      // Get recent readings for this device (last 10 readings)
      const recentReadings = await SensorData.find({
        device_id: data.device_id,
      })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean();

      if (recentReadings.length < 5) {
        return false; // Not enough data
      }

      // Calculate average and standard deviation
      const temps = recentReadings.map((r) => r.temperature);
      const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      const stdDev = Math.sqrt(
        temps.reduce((sq, n) => sq + Math.pow(n - avgTemp, 2), 0) / temps.length
      );

      // Flag as anomaly if more than 2 standard deviations away
      const isAnomaly = Math.abs(data.temperature - avgTemp) > 2 * stdDev;

      return isAnomaly;
    } catch (error) {
      console.error("Error in anomaly detection:", error.message);
      return false;
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      console.log("MQTT Client disconnected");
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      messagesReceived: this.messageCount,
    };
  }
}

export { MQTTService };
