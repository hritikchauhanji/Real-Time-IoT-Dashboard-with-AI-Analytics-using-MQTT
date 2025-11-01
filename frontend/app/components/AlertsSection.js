"use client";

export default function AlertsSection({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-bold mb-4 text-gray-800">
          🔔 Recent Alerts
        </h3>
        <div className="text-center py-8 text-gray-500">
          <p>✅ No alerts at the moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
        🔔 Recent Alerts
        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          {alerts.length}
        </span>
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="p-4 border-l-4 border-red-500 bg-red-50 rounded-r-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-800">
                  Device: {alert.device_id}
                </p>
                <div className="mt-2 space-y-1">
                  {alert.alerts.map((a, idx) => (
                    <p key={idx} className="text-sm text-red-700">
                      ⚠️ {a.message}
                    </p>
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-500 ml-4">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
