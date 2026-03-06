import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import io from "socket.io-client";
import { Thermometer, Droplets, Wifi, WifiOff, Cloud } from "lucide-react";
import Dashboard from "./Dashboard";

function App() {
  const [temperature, setTemperature] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [city, setCity] = useState("Hanoi");
  const [currentCityDisplay, setCurrentCityDisplay] = useState("Ha Noi");

  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const cityOptions = [
    { key: "Hanoi", display: "Ha Noi" },
    { key: "Ho Chi Minh City", display: "Ho Chi Minh" },
    { key: "Da Nang", display: "Da Nang" }
  ];

  const SOCKET_SERVER = process.env.REACT_APP_SOCKET_SERVER || "http://localhost:3000";

  const connectSocket = useCallback(() => {
    try {
      socketRef.current = io(SOCKET_SERVER);

      socketRef.current.on("connect", () => {
        console.log("Socket.io connected");
        setIsConnected(true);
        setConnectionError(null);
      });

      socketRef.current.on(`sensor-${city}`, (data) => {
        if (data.temperature !== undefined) {
          setTemperature(data.temperature);
        }
        if (data.humidity !== undefined) {
          setHumidity(data.humidity);
        }
        setLastUpdate(new Date());
      });

      socketRef.current.on("disconnect", () => {
        console.log("Socket.io disconnected");
        setIsConnected(false);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connectSocket();
        }, 5000);
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("Socket.io error:", error);
        setConnectionError("Không thể kết nối đến server");
      });
    } catch (error) {
      console.error("Error creating Socket.io connection:", error);
      setConnectionError("Không thể kết nối đến server");
    }
  }, [city]);

  useEffect(() => {
    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectSocket]);

  const handleCityChange = (newCity) => {
    const selected = cityOptions.find(c => c.key === newCity);
    setCity(newCity);
    setCurrentCityDisplay(selected.display);
    setTemperature(null);
    setHumidity(null);
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getTemperatureColor = (temp) => {
    if (temp === null) return 'text-gray-400';
    if (temp < 15) return 'text-blue-500';
    if (temp < 25) return 'text-green-500';
    if (temp < 35) return 'text-orange-500';
    return 'text-red-500';
  };

  const getHumidityColor = (hum) => {
    if (hum === null) return 'text-gray-400';
    if (hum < 30) return 'text-red-400';
    if (hum < 60) return 'text-green-500';
    return 'text-blue-500';
  };

  return (
    <div className="min-h-screen weather-background">
      {/* Header */}
      <header className="backdrop-blur-md bg-white/30 border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="weather-icon-container">
                <Cloud className="w-8 h-8 text-sky-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 font-manrope">
                  IoT Weather Monitor
                </h1>
                <p className="text-sm text-gray-600">📍 {currentCityDisplay}</p>
              </div>
            </div>
            {/* City Selector & Controls */}
            <div className="flex items-center gap-4">
              <select
                value={city}
                onChange={(e) => handleCityChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {cityOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.display}
                  </option>
                ))}
              </select>

              {/* Connection Status */}
              {isConnected ? (
                <div 
                  data-testid="connection-status-badge"
                  className="flex items-center gap-2 bg-green-500/20 text-green-700 border border-green-300 px-3 py-1.5 rounded-lg"
                >
                  <Wifi className="w-4 h-4" />
                  <span>Đã kết nối</span>
                </div>
              ) : (
                <div 
                  data-testid="connection-status-badge"
                  className="flex items-center gap-2 bg-red-500/20 text-red-700 border border-red-300 px-3 py-1.5 rounded-lg"
                >
                  <WifiOff className="w-4 h-4" />
                  <span>Mất kết nối</span>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Error Message */}
          {connectionError && (
            <div 
              data-testid="connection-error"
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
            >
              {connectionError}
            </div>
          )}

          {/* Weather Cards Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Temperature Card */}
            <div 
              data-testid="temperature-card"
              className="weather-card group hover:shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="weather-icon-bg bg-gradient-to-br from-orange-400 to-red-500">
                      <Thermometer className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700">Nhiệt độ</h3>
                      <p className="text-sm text-gray-500">Temperature</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-6">
                  {temperature !== null ? (
                    <div className="animate-fade-in">
                      <div className={`text-7xl font-bold mb-2 ${getTemperatureColor(temperature)} transition-colors duration-300`}>
                        {temperature.toFixed(1)}
                      </div>
                      <div className="text-3xl text-gray-400">°C</div>
                    </div>
                  ) : (
                    <div className="text-5xl text-gray-300">
                      <div className="skeleton-pulse">--</div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Trạng thái:</span>
                    <span className="font-medium text-gray-700">
                      {temperature !== null ? (
                        temperature < 15 ? 'Lạnh' :
                        temperature < 25 ? 'Mát mẻ' :
                        temperature < 35 ? 'Ấm áp' : 'Nóng'
                      ) : 'Đang chờ...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Humidity Card */}
            <div 
              data-testid="humidity-card"
              className="weather-card group hover:shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="weather-icon-bg bg-gradient-to-br from-blue-400 to-cyan-500">
                      <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700">Độ ẩm</h3>
                      <p className="text-sm text-gray-500">Humidity</p>
                    </div>
                  </div>
                </div>
                
                <div className="text-center py-6">
                  {humidity !== null ? (
                    <div className="animate-fade-in">
                      <div className={`text-7xl font-bold mb-2 ${getHumidityColor(humidity)} transition-colors duration-300`}>
                        {humidity.toFixed(1)}
                      </div>
                      <div className="text-3xl text-gray-400">%</div>
                    </div>
                  ) : (
                    <div className="text-5xl text-gray-300">
                      <div className="skeleton-pulse">--</div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Trạng thái:</span>
                    <span className="font-medium text-gray-700">
                      {humidity !== null ? (
                        humidity < 30 ? 'Khô' :
                        humidity < 60 ? 'Thoải mái' : 'Ẩm ướt'
                      ) : 'Đang chờ...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard with Chart */}
          <div className="mt-8 mb-8">
            <div className="backdrop-blur-md bg-gradient-to-br from-white/80 to-white/70 border border-white/80 rounded-2xl p-8 shadow-2xl">
              <Dashboard />
            </div>
          </div>

          {/* Last Update Info */}
          <div data-testid="last-update-card" className="backdrop-blur-md bg-white/60 border-white/40 p-6 rounded-xl border border-white/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Cập nhật lần cuối</p>
                <p className="text-lg font-semibold text-gray-800">
                  {formatTime(lastUpdate)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Server</p>
                <p className="text-sm font-mono text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                  {SOCKET_SERVER}
                </p>
              </div>
            </div>
          </div>

          {/* Info Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              Dữ liệu được cậ p nhật tự động qua Socket.io
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
