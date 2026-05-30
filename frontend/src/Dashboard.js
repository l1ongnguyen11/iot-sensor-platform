import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import "./App.css";

function Dashboard() {
  const [data, setData] = useState([]);
  const [latestByCity, setLatestByCity] = useState({});

  useEffect(() => {
    const socket = io(process.env.REACT_APP_SOCKET_SERVER || "http://localhost:3000");
    
    socket.on("sensor-data", (newData) => {
      setData((prev) => [...prev.slice(-50), newData]);
      // Use cityKey from normalized backend payload
      setLatestByCity((prev) => ({ ...prev, [newData.cityKey]: newData }));
    });

    return () => socket.off("sensor-data");
  }, []);

  const cities = ["Hanoi", "Ho Chi Minh City", "Da Nang"];

  return (
    <div className="dashboard">
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
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
        </ResponsiveContainer>
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
