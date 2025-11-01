"use client";

export default function DeviceCard({ data }) {
  const { device_id, temperature, humidity, timestamp, alerts = [] } = data;

  const hasAlert = alerts.length > 0;
  const tempHigh = temperature > 32;
  const humidityHigh = humidity > 75;

  return (
    <div
      className={`p-6 rounded-lg shadow-lg border-2 transition-all ${
        hasAlert ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">{device_id}</h3>
        <div
          className={`w-3 h-3 rounded-full ${
            hasAlert ? "bg-red-500 animate-pulse" : "bg-green-500"
          }`}
        />
      </div>

      <div className="space-y-3">
        {/* Temperature */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌡️</span>
            <span className="text-sm text-gray-600">Temperature</span>
          </div>
          <span
            className={`text-2xl font-bold ${
              tempHigh ? "text-red-600" : "text-blue-600"
            }`}
          >
            {temperature}°C
          </span>
        </div>

        {/* Humidity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💧</span>
            <span className="text-sm text-gray-600">Humidity</span>
          </div>
          <span
            className={`text-2xl font-bold ${
              humidityHigh ? "text-orange-600" : "text-cyan-600"
            }`}
          >
            {humidity}%
          </span>
        </div>

        {/* Timestamp */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Last updated: {new Date(timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="pt-2 space-y-1">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className="text-xs text-red-600 bg-red-100 p-2 rounded"
              >
                ⚠️ {alert.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
