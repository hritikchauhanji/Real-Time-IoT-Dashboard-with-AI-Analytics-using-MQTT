"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function PredictionsCard() {
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/ml/predictions`
        );
        setPredictions(response.data.predictions || []);
      } catch (error) {
        console.error("Error fetching predictions:", error);
      }
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4 text-gray-800">
        🧠 AI Predictions (Next Hour)
      </h3>
      <div className="space-y-3">
        {predictions.map((pred) => (
          <div
            key={pred.device_id}
            className="border-l-4 border-blue-500 pl-4 py-2"
          >
            <p className="font-semibold text-gray-800">{pred.device_id}</p>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-600">
                Current: {pred.current_temp}°C
              </span>
              <span>→</span>
              <span className="font-bold text-blue-600">
                Predicted: {pred.predicted_temp}°C
              </span>
              <span
                className={`text-xs ${
                  pred.trend === "increasing"
                    ? "text-red-500"
                    : "text-green-500"
                }`}
              >
                {pred.trend === "increasing" ? "📈" : "📉"} {pred.trend}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
