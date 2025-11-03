"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useSocket } from "../hooks/useSocket";
import LiveReadings from "../components/LiveReadings";
import TemperatureChart from "../components/TemperatureChart";
import HumidityChart from "../components/HumidityChart";
import AlertsSection from "../components/AlertsSection";
import PredictionsCard from "../components/PredictionsCard";
import AIChatbot from "../components/AIChatbot";

export default function Dashboard() {
  const { isConnected, latestData, alerts } = useSocket();
  const [historicalData, setHistoricalData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Detect environment
  const isProduction =
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1";

  // Fetch historical data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/sensor-data?limit=50`
        );
        setHistoricalData(response.data.data || []);

        const statsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/stats`
        );
        setStats(statsResponse.data.stats || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh stats every 30 seconds
    const interval = setInterval(async () => {
      try {
        const statsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/stats`
        );
        setStats(statsResponse.data.stats || []);
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
          <p className="text-xs text-gray-500 mt-2">
            {isProduction ? "Production Mode" : "Development Mode"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🏭 IoT Dashboard
            </h1>
            <p className="text-gray-600">
              Real-time sensor monitoring with AI analytics
            </p>
          </div>
          {/* Environment Badge */}
          <div className="hidden md:block">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                isProduction
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isProduction
                ? "🌐 Production (Polling)"
                : "⚡ Development (WebSocket)"}
            </span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat._id} className="bg-white p-6 rounded-lg shadow-lg">
              <h4 className="text-sm text-gray-600 mb-2">{stat._id}</h4>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  Avg Temp:{" "}
                  <span className="font-semibold">
                    {stat.avgTemp.toFixed(1)}°C
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  Avg Humidity:{" "}
                  <span className="font-semibold">
                    {stat.avgHumidity.toFixed(1)}%
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  Readings: <span className="font-semibold">{stat.count}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Readings */}
      <LiveReadings data={latestData} isConnected={isConnected} />

      {/* AI Predictions Section */}
      <div className="mb-8">
        <PredictionsCard />
      </div>

      {/* Charts - NOW WITH LIVE DATA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TemperatureChart data={historicalData} liveData={latestData} />
        <HumidityChart data={historicalData} liveData={latestData} />
      </div>

      {/* Alerts */}
      <AlertsSection alerts={alerts} />

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
}
