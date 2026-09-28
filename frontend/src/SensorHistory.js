import React, { useState, useEffect, useCallback } from "react";
import { API_URL } from "./config";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { RefreshCw, Thermometer, Droplets, Calendar, BarChart2 } from "lucide-react";

function SensorHistory() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [hours, setHours] = useState(24);
  const [historyData, setHistoryData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch available devices for selector
  useEffect(() => {
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDevices(data);
          setSelectedDevice((prev) => prev || data[0].deviceId);
        }
      })
      .catch((err) => console.warn("Failed to fetch devices for history component:", err));
  }, []);

  const getLimitForHours = (h) => {
    if (h <= 1) return 200;
    if (h <= 6) return 300;
    if (h <= 24) return 500;
    return 1000;
  };

  const fetchHistoryAndStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const limit = getLimitForHours(hours);
      let historyUrl = `${API_URL}/api/sensors/history?hours=${hours}&limit=${limit}`;
      let statsUrl = `${API_URL}/api/sensors/stats?hours=${hours}`;

      if (selectedDevice) {
        historyUrl += `&deviceId=${encodeURIComponent(selectedDevice)}`;
        statsUrl += `&deviceId=${encodeURIComponent(selectedDevice)}`;
      }

      const [histRes, statsRes] = await Promise.all([
        fetch(historyUrl),
        fetch(statsUrl)
      ]);

      if (!histRes.ok || !statsRes.ok) {
        throw new Error("API returned non-200 status");
      }

      const histJson = await histRes.json();
      const statsJson = await statsRes.json();

      setHistoryData(histJson.data || []);
      setStats(statsJson || null);
    } catch (err) {
      console.error("Error loading sensor history:", err);
      setError("Unable to load sensor history.");
      setHistoryData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice, hours]);

  useEffect(() => {
    fetchHistoryAndStats();
  }, [fetchHistoryAndStats]);

  const formatTickTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (hours > 24) {
      return date.toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" }) + " " +
             date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatTooltipTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  return (
    <div className="backdrop-blur-md bg-white/70 border border-gray-200 rounded-2xl p-6 shadow-xl text-gray-800">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-600">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Sensor History & Analytics</h2>
            <p className="text-xs text-gray-500">Lịch sử đo nhiệt độ & độ ẩm theo thời gian</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Device Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Device:</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Devices</option>
              {devices.map((dev) => (
                <option key={dev.deviceId} value={dev.deviceId}>
                  {dev.name && dev.name !== dev.deviceId ? `${dev.name} (${dev.deviceId})` : dev.deviceId}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchHistoryAndStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-12 text-center text-gray-500 animate-pulse font-medium">
          ⏳ Loading sensor history...
        </div>
      )}

      {error && !loading && (
        <div className="py-6 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && historyData.length === 0 && (
        <div className="py-12 text-center text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
          No sensor data available for this time range.
        </div>
      )}

      {/* Main Visualizations & Stats */}
      {!loading && !error && historyData.length > 0 && (
        <div className="space-y-8">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Temperature Stats */}
              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200">
                <div className="flex items-center gap-2 mb-2 text-orange-700 font-semibold text-sm">
                  <Thermometer className="w-4 h-4" />
                  <span>Temperature Stats</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div>
                    <span className="text-xs text-gray-500 block">Average</span>
                    <span className="text-lg font-bold text-orange-600">{stats.temperature?.average ?? "N/A"}°C</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Min</span>
                    <span className="text-lg font-bold text-blue-600">{stats.temperature?.min ?? "N/A"}°C</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Max</span>
                    <span className="text-lg font-bold text-red-600">{stats.temperature?.max ?? "N/A"}°C</span>
                  </div>
                </div>
              </div>

              {/* Humidity Stats */}
              <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200">
                <div className="flex items-center gap-2 mb-2 text-cyan-700 font-semibold text-sm">
                  <Droplets className="w-4 h-4" />
                  <span>Humidity Stats</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div>
                    <span className="text-xs text-gray-500 block">Average</span>
                    <span className="text-lg font-bold text-cyan-600">{stats.humidity?.average ?? "N/A"}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Min</span>
                    <span className="text-lg font-bold text-slate-600">{stats.humidity?.min ?? "N/A"}%</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Max</span>
                    <span className="text-lg font-bold text-blue-600">{stats.humidity?.max ?? "N/A"}%</span>
                  </div>
                </div>
              </div>

              {/* Readings & Range Stats */}
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
                <div className="flex items-center justify-between text-purple-700 font-semibold text-sm mb-2">
                  <span>Data Summary</span>
                  <span className="text-xs bg-purple-200 px-2 py-0.5 rounded-full text-purple-800">{stats.range}</span>
                </div>
                <div className="flex items-center justify-around text-center mt-2">
                  <div>
                    <span className="text-xs text-gray-500 block">Total Readings</span>
                    <span className="text-2xl font-bold text-purple-700">{stats.readings}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block">Chart Points</span>
                    <span className="text-2xl font-bold text-purple-700">{historyData.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Temperature Chart */}
          <div className="bg-white/80 p-5 rounded-xl border border-gray-200">
            <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-orange-500" />
              <span>Temperature History (°C)</span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTickTime}
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                  <Tooltip
                    labelFormatter={formatTooltipTime}
                    formatter={(value) => [`${value}°C`, "Temperature"]}
                    contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidity Chart */}
          <div className="bg-white/80 p-5 rounded-xl border border-gray-200">
            <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-500" />
              <span>Humidity History (%)</span>
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTickTime}
                    stroke="#64748b"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={formatTooltipTime}
                    formatter={(value) => [`${value}%`, "Humidity"]}
                    contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SensorHistory;
