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
    </div>
  );
}

export default Dashboard;
