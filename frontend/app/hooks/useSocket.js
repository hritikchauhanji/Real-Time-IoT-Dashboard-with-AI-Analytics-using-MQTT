"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestData, setLatestData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // Detect if we're on Vercel (production) or localhost
    const isProduction =
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1";

    if (!isProduction) {
      // Use WebSocket for localhost
      console.log("🔌 Using WebSocket (Local Development)");

      const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL, {
        transports: ["websocket"],
        autoConnect: true,
      });

      socketInstance.on("connect", () => {
        console.log("✓ Connected to WebSocket");
        setIsConnected(true);
      });

      socketInstance.on("disconnect", () => {
        console.log("✗ Disconnected from WebSocket");
        setIsConnected(false);
      });

      socketInstance.on("sensor-update", (data) => {
        setLatestData((prev) => {
          const existingIndex = prev.findIndex(
            (item) => item.device_id === data.device_id
          );

          if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = data;
            return updated;
          } else {
            return [...prev, data];
          }
        });
      });

      socketInstance.on("alert", (alertData) => {
        setAlerts((prev) => [
          {
            ...alertData,
            id: Date.now(),
            timestamp: new Date().toISOString(),
          },
          ...prev.slice(0, 49),
        ]);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    } else {
      // Use HTTP Polling for Vercel deployment
      console.log("📡 Using HTTP Polling (Vercel Production)");

      // Check if backend is available
      const checkConnection = async () => {
        try {
          await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/health`);
          setIsConnected(true);
        } catch (error) {
          console.error("Backend not reachable:", error);
          setIsConnected(false);
        }
      };

      // Fetch latest sensor data
      const fetchLatestData = async () => {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/sensor-data/latest`
          );

          if (response.data.success) {
            setLatestData(response.data.data || []);
            setIsConnected(true);
          }
        } catch (error) {
          console.error("Error fetching latest data:", error);
          setIsConnected(false);
        }
      };

      // Fetch alerts
      const fetchAlerts = async () => {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/api/alerts?limit=50`
          );

          if (response.data.success) {
            const newAlerts = response.data.alerts || [];

            const formattedAlerts = newAlerts.map((alert, index) => ({
              ...alert,
              id: alert._id || Date.now() + index,
              timestamp: alert.timestamp || new Date().toISOString(),
            }));

            setAlerts(formattedAlerts);
          }
        } catch (error) {
          console.error("Error fetching alerts:", error);
        }
      };

      // Initial fetch
      checkConnection();
      fetchLatestData();
      fetchAlerts();

      // Poll every 5 seconds
      const connectionInterval = setInterval(checkConnection, 30000);
      const dataInterval = setInterval(fetchLatestData, 5000);
      const alertInterval = setInterval(fetchAlerts, 10000);

      return () => {
        clearInterval(connectionInterval);
        clearInterval(dataInterval);
        clearInterval(alertInterval);
      };
    }
  }, []);

  return { socket, isConnected, latestData, alerts };
};
