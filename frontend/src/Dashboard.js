import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { API_URL, SOCKET_SERVER } from "./config";
import SafeResponsiveContainer from "./SafeResponsiveContainer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import "./App.css";

function Dashboard() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/sensors/history?limit=20`)
      .then((res) => res.json())
      .then((result) => {
        if (result && Array.isArray(result.data) && result.data.length > 0) {
          setData(result.data);
        }
      })
      .catch((err) => console.warn("Failed to load initial dashboard data:", err));

    const socket = io(SOCKET_SERVER, {
      transports: ["polling", "websocket"]
    });

    socket.on("sensor-data", (newData) => {
      setData((prev) => [...prev.slice(-50), newData]);
    });

    return () => {
      socket.off("sensor-data");
      socket.disconnect();
    };
  }, []);

  return (
    <div className="dashboard">
      <div className="chart-wrapper">
        <SafeResponsiveContainer height={300} minHeight={300} initialWidth={800} initialHeight={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            />
            <YAxis />
            <Tooltip labelFormatter={(time) => new Date(time).toLocaleString()} />
            <Line type="monotone" dataKey="temperature" stroke="#f1c40f" dot={false} />
            <Line type="monotone" dataKey="humidity" stroke="#2ecc71" dot={false} />
          </LineChart>
        </SafeResponsiveContainer>
      </div>
      {/* Statistics Row */}
      <div className="stats-row mt-4 flex gap-4">
        <div className="stat-box">
          <div className="stat-title">Max Temp</div>
          <div className="stat-value">
            {data.length > 0 ? `${Math.max(...data.map(d => d.temperature)).toFixed(0)}°C` : 'N/A'}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-title">Min Temp</div>
          <div className="stat-value">
            {data.length > 0 ? `${Math.min(...data.map(d => d.temperature)).toFixed(0)}°C` : 'N/A'}
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-title">Avg Humidity</div>
          <div className="stat-value">
            {data.length > 0 ? `${(data.reduce((s, d) => s + (d.humidity || 0), 0) / data.length).toFixed(0)}%` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
