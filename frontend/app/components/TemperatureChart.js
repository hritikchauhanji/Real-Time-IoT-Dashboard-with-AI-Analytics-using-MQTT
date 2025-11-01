"use client";

import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function TemperatureChart({ data, liveData }) {
  const [chartData, setChartData] = useState([]);
  const MAX_POINTS = 20;
  const lastUpdateRef = useRef(0);
  const UPDATE_INTERVAL = 5000; // Only update every 5 seconds

  useEffect(() => {
    if (data && data.length > 0) {
      const formattedData = formatDataByTimestamp(data.slice(-MAX_POINTS));
      setChartData(formattedData);
    }
  }, [data]);

  useEffect(() => {
    if (liveData && liveData.length > 0) {
      const now = Date.now();

      // Only update if at least UPDATE_INTERVAL has passed
      if (now - lastUpdateRef.current < UPDATE_INTERVAL) {
        return; // Skip this update
      }

      lastUpdateRef.current = now;

      setChartData((prevData) => {
        const timestamp = now;
        const timeLabel = new Date(timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        // Check if we already have data for this exact second
        const lastPoint = prevData[prevData.length - 1];
        if (lastPoint && lastPoint.time === timeLabel) {
          return prevData; // Don't add duplicate
        }

        const newPoint = {
          time: timeLabel,
          timestamp: timestamp,
        };

        // Add all device temperatures
        liveData.forEach((device) => {
          newPoint[device.device_id] = device.temperature;
        });

        // Add new point and keep only MAX_POINTS
        const updatedData = [...prevData, newPoint];

        if (updatedData.length > MAX_POINTS) {
          return updatedData.slice(-MAX_POINTS);
        }

        return updatedData;
      });
    }
  }, [liveData]);

  const formatDataByTimestamp = (rawData) => {
    const timeMap = new Map();

    rawData.forEach((item) => {
      const time = new Date(item.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const timestamp = new Date(item.timestamp).getTime();

      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, {
          time: time,
          timestamp: timestamp,
        });
      }

      timeMap.get(timestamp)[item.device_id] = item.temperature;
    });

    return Array.from(timeMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Waiting for data...</p>
      </div>
    );
  }

  const allDevices = new Set();
  chartData.forEach((point) => {
    Object.keys(point).forEach((key) => {
      if (key !== "time" && key !== "timestamp") {
        allDevices.add(key);
      }
    });
  });
  const devices = Array.from(allDevices);

  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-800">
          🌡️ Temperature Trends
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-xs text-gray-600">Live Streaming</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 11 }}
            interval={Math.floor(MAX_POINTS / 8)}
            stroke="#666"
          />
          <YAxis
            label={{
              value: "Temperature (°C)",
              angle: -90,
              position: "insideLeft",
            }}
            domain={["dataMin - 2", "dataMax + 2"]}
            stroke="#666"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          />
          <Legend wrapperStyle={{ paddingTop: "10px" }} />
          {devices.map((device, index) => (
            <Line
              key={device}
              type="monotone"
              dataKey={device}
              name={device}
              stroke={colors[index % colors.length]}
              strokeWidth={2.5}
              dot={true}
              activeDot={{ r: 6 }}
              connectNulls={true}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
        <span>Showing last {chartData.length} readings</span>
        <span>
          Last updated:{" "}
          {chartData.length > 0 ? chartData[chartData.length - 1].time : "N/A"}
        </span>
      </div>
    </div>
  );
}
