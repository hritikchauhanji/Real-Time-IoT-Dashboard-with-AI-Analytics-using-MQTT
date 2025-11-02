"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm your IoT Assistant. Ask me about sensor data, temperatures, or alerts!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getSensorData = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sensor-data/latest`
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching sensor data:", error);
      return [];
    }
  };

  const getStats = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stats`
      );
      return response.data.stats || [];
    } catch (error) {
      console.error("Error fetching stats:", error);
      return [];
    }
  };

  const getAlerts = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/alerts`
      );
      return response.data.alerts || [];
    } catch (error) {
      console.error("Error fetching alerts:", error);
      return [];
    }
  };

  const processQuery = async (query) => {
    const lowerQuery = query.toLowerCase();

    // Get current sensor data
    const sensorData = await getSensorData();
    const stats = await getStats();
    const alerts = await getAlerts();

    // Question patterns
    if (lowerQuery.includes("temperature") || lowerQuery.includes("temp")) {
      if (lowerQuery.includes("average") || lowerQuery.includes("avg")) {
        // Average temperature
        if (stats.length > 0) {
          const avgTemp =
            stats.reduce((sum, s) => sum + s.avgTemp, 0) / stats.length;
          return `📊 The average temperature today is **${avgTemp.toFixed(
            1
          )}°C** across all sensors.\n\nBreakdown:\n${stats
            .map((s) => `• ${s._id}: ${s.avgTemp.toFixed(1)}°C`)
            .join("\n")}`;
        }
      } else if (
        lowerQuery.includes("current") ||
        lowerQuery.includes("now") ||
        lowerQuery.includes("latest")
      ) {
        // Current temperature
        if (sensorData.length > 0) {
          return `🌡️ **Current temperatures:**\n\n${sensorData
            .map((s) => `• ${s.device_id}: ${s.temperature}°C`)
            .join("\n")}`;
        }
      } else if (lowerQuery.includes("highest") || lowerQuery.includes("max")) {
        // Highest temperature
        if (stats.length > 0) {
          const maxStat = stats.reduce((max, s) =>
            s.maxTemp > max.maxTemp ? s : max
          );
          return `🔥 The highest temperature recorded is **${maxStat.maxTemp.toFixed(
            1
          )}°C** from ${maxStat._id}.`;
        }
      } else if (lowerQuery.includes("lowest") || lowerQuery.includes("min")) {
        // Lowest temperature
        if (stats.length > 0) {
          const minStat = stats.reduce((min, s) =>
            s.minTemp < min.minTemp ? s : min
          );
          return `❄️ The lowest temperature recorded is **${minStat.minTemp.toFixed(
            1
          )}°C** from ${minStat._id}.`;
        }
      } else {
        return `🌡️ **Current temperatures:**\n\n${sensorData
          .map((s) => `• ${s.device_id}: ${s.temperature}°C`)
          .join("\n")}`;
      }
    }

    if (lowerQuery.includes("humidity")) {
      if (lowerQuery.includes("average") || lowerQuery.includes("avg")) {
        // Average humidity
        if (stats.length > 0) {
          const avgHumidity =
            stats.reduce((sum, s) => sum + s.avgHumidity, 0) / stats.length;
          return `💧 The average humidity today is **${avgHumidity.toFixed(
            1
          )}%** across all sensors.\n\nBreakdown:\n${stats
            .map((s) => `• ${s._id}: ${s.avgHumidity.toFixed(1)}%`)
            .join("\n")}`;
        }
      } else {
        // Current humidity
        if (sensorData.length > 0) {
          return `💧 **Current humidity levels:**\n\n${sensorData
            .map((s) => `• ${s.device_id}: ${s.humidity}%`)
            .join("\n")}`;
        }
      }
    }

    if (
      lowerQuery.includes("alert") ||
      lowerQuery.includes("warning") ||
      lowerQuery.includes("problem")
    ) {
      if (alerts.length > 0) {
        return `⚠️ **Active Alerts (${alerts.length}):**\n\n${alerts
          .slice(0, 5)
          .map(
            (a) =>
              `• ${a.device_id}: ${
                a.alerts?.[0]?.message || "Anomaly detected"
              }`
          )
          .join("\n")}`;
      } else {
        return `✅ Great news! No active alerts at the moment. All sensors are operating normally.`;
      }
    }

    if (lowerQuery.includes("sensor") || lowerQuery.includes("device")) {
      if (lowerQuery.includes("how many") || lowerQuery.includes("count")) {
        return `📱 There are **${sensorData.length} active sensors** currently monitoring the environment.`;
      } else {
        return `📱 **Active Sensors:**\n\n${sensorData
          .map(
            (s) =>
              `• ${s.device_id} - Temp: ${s.temperature}°C, Humidity: ${s.humidity}%`
          )
          .join("\n")}`;
      }
    }

    // Suggestions based on data
    if (
      lowerQuery.includes("suggestion") ||
      lowerQuery.includes("recommend") ||
      lowerQuery.includes("what should")
    ) {
      const highTempSensors = sensorData.filter((s) => s.temperature > 32);
      const highHumiditySensors = sensorData.filter((s) => s.humidity > 75);

      let suggestions = "💡 **Recommendations:**\n\n";

      if (highTempSensors.length > 0) {
        suggestions += `🔥 High temperature detected in ${highTempSensors.length} sensor(s):\n`;
        suggestions += `• Turn on air conditioning or fans\n`;
        suggestions += `• Open windows for ventilation\n`;
        suggestions += `• Check equipment for overheating\n\n`;
      }

      if (highHumiditySensors.length > 0) {
        suggestions += `💧 High humidity detected in ${highHumiditySensors.length} sensor(s):\n`;
        suggestions += `• Use dehumidifier\n`;
        suggestions += `• Improve ventilation\n`;
        suggestions += `• Check for water leaks\n\n`;
      }

      if (highTempSensors.length === 0 && highHumiditySensors.length === 0) {
        suggestions += `✅ All environmental conditions are normal. No action needed!`;
      }

      return suggestions;
    }

    // Help/capabilities
    if (
      lowerQuery.includes("help") ||
      lowerQuery.includes("what can you do") ||
      lowerQuery.includes("capabilities")
    ) {
      return `🤖 **I can help you with:**

• "What's the average temperature today?"
• "Show me current humidity levels"
• "Are there any alerts?"
• "What's the highest temperature?"
• "How many sensors are active?"
• "Give me recommendations"
• "Show current sensor readings"

Just ask me anything about your IoT sensors! 😊`;
    }

    // Default response
    return `🤔 I'm not sure how to answer that. Try asking:
• "What's the current temperature?"
• "Show me alerts"
• "Give me recommendations"
• Type "help" to see what I can do!`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await processQuery(input);

      const assistantMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        role: "assistant",
        content: "❌ Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "What's the average temperature?",
    "Show me current alerts",
    "Give me recommendations",
    "How many sensors are active?",
  ];

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center gap-2 group"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <span className="hidden group-hover:inline-block text-sm font-medium">
            Ask AI Assistant
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                🤖
              </div>
              <div>
                <h3 className="font-bold">IoT AI Assistant</h3>
                <p className="text-xs text-blue-100">Always ready to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 rounded-bl-none shadow-sm"
                  }`}
                >
                  <div className="text-sm whitespace-pre-line">
                    {msg.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      msg.role === "user" ? "text-blue-200" : "text-gray-400"
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="p-3 bg-gray-100 border-t border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {quickQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(question)}
                  className="px-3 py-1.5 bg-white text-xs text-gray-700 rounded-full whitespace-nowrap hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 p-3 text-gray-700 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
