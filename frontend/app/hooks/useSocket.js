"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestData, setLatestData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
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
        ...prev.slice(0, 49), // Keep last 50 alerts
      ]);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected, latestData, alerts };
};
