"use client";

import DeviceCard from "./DeviceCard";

export default function LiveReadings({ data, isConnected }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          📡 Live Sensor Readings
        </h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="bg-gray-50 p-12 rounded-lg text-center">
          <p className="text-gray-500">
            Waiting for sensor data... Make sure your MQTT publisher is running.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {data.map((device) => (
            <DeviceCard key={device.device_id} data={device} />
          ))}
        </div>
      )}
    </div>
  );
}
