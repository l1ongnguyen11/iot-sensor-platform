import React, { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import { API_URL, SOCKET_SERVER } from "./config";
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Droplets,
  WifiOff,
  Check
} from "lucide-react";

function AlertPanel() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
    total: 0
  });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [filterDevice, setFilterDevice] = useState("All");
  const [filterType, setFilterType] = useState("All");

  // Fetch devices for filter dropdown
  useEffect(() => {
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDevices(data);
      })
      .catch((err) => console.warn("Failed to fetch devices for alert filter:", err));
  }, []);

  // Fetch alerts and stats from API
  const fetchAlertsAndStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "All") params.append("status", filterStatus.toLowerCase());
      if (filterSeverity !== "All") params.append("severity", filterSeverity.toLowerCase());
      if (filterDevice !== "All") params.append("deviceId", filterDevice);
      if (filterType !== "All") params.append("type", filterType);
      params.append("limit", "100");

      const [alertsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/alerts?${params.toString()}`),
        fetch(`${API_URL}/api/alerts/stats`)
      ]);

      if (!alertsRes.ok || !statsRes.ok) throw new Error("Failed to load alerts data");

      const alertsData = await alertsRes.json();
      const statsData = await statsRes.json();

      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setStats(statsData || { active: 0, acknowledged: 0, resolved: 0, critical: 0, warning: 0, total: 0 });
    } catch (err) {
      console.error("Error loading alert data:", err);
      setError("Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSeverity, filterDevice, filterType]);

  useEffect(() => {
    fetchAlertsAndStats();
  }, [fetchAlertsAndStats]);

  // Socket.io Realtime Listener
  useEffect(() => {
    const socket = io(SOCKET_SERVER, {
      transports: ["polling", "websocket"]
    });

    socket.on("alert:new", (newAlert) => {
      setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)]);
      fetch(`${API_URL}/api/alerts/stats`)
        .then((r) => r.json())
        .then((s) => setStats(s))
        .catch(() => {});
    });

    socket.on("alert:updated", (updatedAlert) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
      );
      fetch(`${API_URL}/api/alerts/stats`)
        .then((r) => r.json())
        .then((s) => setStats(s))
        .catch(() => {});
    });

    return () => {
      socket.off("alert:new");
      socket.off("alert:updated");
      socket.disconnect();
    };
  }, []);

  // Action handlers
  const handleAcknowledge = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/alerts/${id}/acknowledge`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Acknowledge failed");
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setActionFeedback("Alert acknowledged successfully.");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error("Error acknowledging alert:", err);
      setActionFeedback("Failed to acknowledge alert.");
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/alerts/${id}/resolve`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Resolve failed");
      const updated = await res.json();
      setAlerts((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setActionFeedback("Alert resolved successfully.");
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (err) {
      console.error("Error resolving alert:", err);
      setActionFeedback("Failed to resolve alert.");
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return "N/A";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "HIGH_TEMPERATURE":
      case "LOW_TEMPERATURE":
        return <Thermometer className="w-4 h-4 text-orange-500" />;
      case "HIGH_HUMIDITY":
        return <Droplets className="w-4 h-4 text-cyan-500" />;
      case "DEVICE_OFFLINE":
        return <WifiOff className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const getValueUnit = (type, val) => {
    if (val === null || val === undefined) return "N/A";
    if (type === "HIGH_TEMPERATURE" || type === "LOW_TEMPERATURE") return `${val}°C`;
    if (type === "HIGH_HUMIDITY") return `${val}%`;
    return val;
  };

  const getThresholdUnit = (type, thresh) => {
    if (thresh === null || thresh === undefined) return "N/A";
    if (type === "HIGH_TEMPERATURE" || type === "LOW_TEMPERATURE") return `${thresh}°C`;
    if (type === "HIGH_HUMIDITY") return `${thresh}%`;
    if (type === "DEVICE_OFFLINE") return `${thresh / 1000}s`;
    return thresh;
  };

  return (
    <div className="backdrop-blur-md bg-white/70 border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl text-gray-800">
      {/* Title & Feedback */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-red-500/10 rounded-xl text-red-600">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
              <span>Alert Monitoring System</span>
              {stats.active > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                  {stats.active} Active
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500">Realtime threshold monitoring and status tracking</p>
          </div>
        </div>

        {actionFeedback && (
          <div className="px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 animate-fade-in self-start md:self-auto">
            <Check className="w-4 h-4" />
            <span>{actionFeedback}</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-4 sm:mb-6">
        {/* Active Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Active</span>
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-red-700">{stats.active}</div>
        </div>

        {/* Acknowledged Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Acked</span>
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-amber-700">{stats.acknowledged}</div>
        </div>

        {/* Critical Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">Critical</span>
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-rose-700">{stats.critical}</div>
        </div>

        {/* Warning Card */}
        <div className="p-3 sm:p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-900 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-yellow-700">Warning</span>
            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold mt-1.5 sm:mt-2 text-yellow-700">{stats.warning}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50/80 rounded-xl border border-gray-200">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 text-xs font-semibold text-gray-600 mr-1">
            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Resolved">Resolved</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="w-full sm:w-auto px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Severities</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>

          {/* Device Filter */}
          <select
            value={filterDevice}
            onChange={(e) => setFilterDevice(e.target.value)}
            className="w-full sm:w-auto px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Devices</option>
            {devices.map((dev) => (
              <option key={dev.deviceId} value={dev.deviceId}>
                {dev.deviceId}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full sm:w-auto px-2 py-1.5 border border-gray-300 rounded-lg text-xs bg-white font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="All">All Types</option>
            <option value="HIGH_TEMPERATURE">High Temp</option>
            <option value="LOW_TEMPERATURE">Low Temp</option>
            <option value="HIGH_HUMIDITY">High Humidity</option>
            <option value="DEVICE_OFFLINE">Device Offline</option>
          </select>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchAlertsAndStats}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 w-full sm:w-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-8 text-center text-xs sm:text-sm text-gray-500 animate-pulse font-medium">
          Loading alerts...
        </div>
      )}

      {error && !loading && (
        <div className="py-4 text-center text-xs sm:text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
          [ERROR] {error}
        </div>
      )}

      {!loading && !error && alerts.length === 0 && (
        <div className="py-8 text-center text-xs sm:text-sm text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
          No alerts match the selected criteria.
        </div>
      )}

      {/* Alert Table */}
      {!loading && !error && alerts.length > 0 && (
        <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Status</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Severity</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Device</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">City</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Type</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Message</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Value</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Threshold</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Time</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                return (
                  <tr
                    key={alert.id}
                    className="border-t border-gray-100 hover:bg-white/60 transition-colors text-xs"
                  >
                    {/* Status Column */}
                    <td className="px-3 py-3">
                      {alert.status === "active" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-xs">
                          Active
                        </span>
                      )}
                      {alert.status === "acknowledged" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          Acked
                        </span>
                      )}
                      {alert.status === "resolved" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                          <CheckCircle className="w-3 h-3 text-green-600" /> Resolved
                        </span>
                      )}
                    </td>

                    {/* Severity Column */}
                    <td className="px-3 py-3 font-semibold">
                      {alert.severity === "critical" ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                          Critical
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-700 font-semibold">
                          Warning
                        </span>
                      )}
                    </td>

                    {/* Device Column */}
                    <td className="px-3 py-3 font-mono font-semibold text-gray-800">
                      {alert.deviceId}
                    </td>

                    {/* City Column */}
                    <td className="px-3 py-3 text-gray-700">
                      {alert.cityDisplay || alert.cityKey || "N/A"}
                    </td>

                    {/* Type Column */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-gray-800">
                        {getTypeIcon(alert.type)}
                        <span>{alert.type}</span>
                      </div>
                    </td>

                    {/* Message Column */}
                    <td className="px-3 py-3 text-gray-800 font-medium">
                      {alert.message}
                    </td>

                    {/* Value Column */}
                    <td className="px-3 py-3 font-mono font-bold text-gray-900">
                      {getValueUnit(alert.type, alert.value)}
                    </td>

                    {/* Threshold Column */}
                    <td className="px-3 py-3 font-mono text-gray-500">
                      {getThresholdUnit(alert.type, alert.threshold)}
                    </td>

                    {/* Time Column */}
                    <td className="px-3 py-3 font-mono text-gray-500">
                      {formatDateTime(alert.createdAt)}
                    </td>

                    {/* Action Buttons Column */}
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {alert.status === "active" && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-semibold transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}

                        {(alert.status === "active" || alert.status === "acknowledged") && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors"
                          >
                            Resolve
                          </button>
                        )}

                        {alert.status === "resolved" && (
                          <span className="text-xs text-gray-400 font-mono">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AlertPanel;
