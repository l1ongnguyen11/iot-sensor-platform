# IoT Weather Monitoring Platform

Nền tảng giám sát thời tiết thời gian thực cho các thành phố Việt Nam, được xây dựng với công nghệ **Node.js**, **React**, **MongoDB**, **Socket.io** và **MQTT**.

## 🎯 Tính năng chính

✅ **Giám sát thời tiết thực tế**
- Hiển thị nhiệt độ và độ ẩm theo thời gian thực
- Hỗ trợ 3 thành phố: Hà Nội, Thành phố Hồ Chí Minh, Đà Nẵng
- Cập nhật dữ liệu tự động qua Socket.io

✅ **Giao diện được thiết kế hiện đại**
- Gradient backgrounds với glassmorphic effect
- Responsive design - tối ưu cho mobile, tablet, desktop
- Tailwind CSS + Custom CSS Animations
- Smooth transitions & animations

✅ **Biểu đồ lịch sử**
- Biểu đồ đường (Line Chart) hiển thị xu hướng nhiệt độ & độ ẩm
- Cập nhật tự động khi có dữ liệu mới
- Tooltip tương tác

✅ **Kiến trúc dựa trên sự kiện**
- MQTT pub/sub cho các thiết bị IoT
- WebSocket (Socket.io) cho frontend real-time
- REST API cho truy vấn dữ liệu

✅ **Quản lý dữ liệu**
- MongoDB lưu trữ với TTL index (tự động xóa dữ liệu cũ sau 30 ngày)
- Chuẩn hóa dữ liệu với `cityKey` (Hanoi, Ho Chi Minh City, Da Nang)
- Hiển thị tên địa phương `cityDisplay` (Ha Noi, Ho Chi Minh, Da Nang)

---

## 📋 Yêu cầu hệ thống

- **Node.js** >= 14.x
- **MongoDB** >= 4.4 (local hoặc cloud)
- **MQTT Broker** (Mosquitto) - cho device simulator
- **npm** hoặc **yarn**

---

## 🚀 Cài đặt & Chạy

### 1️⃣ Clone & Cài đặt dependencies

```bash
# Cài backend
cd backend
npm install

# Cài frontend (terminal mới)
cd ../frontend
npm install

# Cài device simulator (terminal mới)
cd ../device-simulator
npm install
```

### 2️⃣ Cấu hình MongoDB

**Tùy chọn A: Chạy MongoDB local (Windows)**

```bash
# Nếu chưa cài MongoDB, tải từ https://www.mongodb.com/try/download/community
# Sau khi cài, MongoDB sẽ chạy ở localhost:27017
```

**Tùy chọn B: Dùng MongoDB Atlas Cloud (free)**

```bash
# Tạo tài khoản tại https://www.mongodb.com/cloud/atlas
# Tạo cluster free tier
# Lấy connection string, ví dụ:
# mongodb+srv://username:password@cluster.mongodb.net/iot_db
```

Cập nhật `backend/server.js`:

```javascript
// LOCAL
const mongoURI = 'mongodb://localhost:27017/iot_db';

// HOẶC CLOUD
// const mongoURI = 'mongodb+srv://user:pass@cluster.mongodb.net/iot_db';
```

### 3️⃣ Cấu hình MQTT (nếu dùng device simulator)

**Tùy chọn A: Mosquitto Local**

```bash
# Windows: Tải từ https://mosquitto.org/download/
# Linux/Mac:
# brew install mosquitto

# Kiểm tra Mosquitto chạy ở localhost:1883
```

**Tùy chọn B: Bỏ qua simulator, manual publish**

```bash
# Device simulator là optional, có thể test với direct API calls
```

### 4️⃣ Chạy các service

**Terminal 1 - Backend Server:**

```bash
cd backend
npm start
# Chạy ở http://localhost:3000
```

**Terminal 2 - Frontend Dev:**

```bash
cd frontend
npm start
# Chạy ở http://localhost:3002 (hoặc port khác nếu 3002 bị dùng)
```

**Terminal 3 - Device Simulator (optional):**

```bash
cd device-simulator
npm start
# Publish sensor data tới MQTT broker
# Dữ liệu được forward tới backend qua MQTT
```

---

## 📁 Cấu trúc dự án

```
iot-sensor-platform/
├── backend/                    # Node.js + Express server
│   ├── models/
│   │   ├── Device.js          # Schema thiết bị IoT
│   │   └── SensorData.js       # Schema dữ liệu cảm biến
│   ├── server.js               # Express + Socket.io + MQTT
│   ├── package.json
│   └── node_modules/
│
├── frontend/                   # React + Tailwind CSS
│   ├── src/
│   │   ├── App.js              # Component chính
│   │   ├── Dashboard.js        # Biểu đồ lịch sử
│   │   ├── App.css             # Custom styles + animations
│   │   ├── index.css           # Tailwind directives
│   │   └── index.js            # React entry point
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── favicon.ico
│   ├── tailwind.config.js      # Tailwind configuration
│   ├── postcss.config.js       # PostCSS configuration
│   ├── package.json
│   └── node_modules/
│
├── device-simulator/           # MQTT publisher
│   ├── device.js               # Simulate IoT sensors
│   ├── package.json
│   └── node_modules/
│
└── README.md
```

---

## 🔌 API Endpoints

### REST API

**Lấy dữ liệu sensor theo thành phố:**

```bash
GET /api/sensor/city/:city
Content-Type: application/json

# Ví dụ:
curl http://localhost:3000/api/sensor/city/Hanoi
```

**Response:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "cityKey": "Hanoi",
  "cityDisplay": "Ha Noi",
  "temperature": 28.5,
  "humidity": 72.3,
  "timestamp": "2026-02-07T10:30:00.000Z"
}
```

**Đăng ký thiết bị:**

```bash
POST /api/devices
Content-Type: application/json

{
  "deviceId": "device-001",
  "name": "Sensor Hanoi",
  "cityKey": "Hanoi",
  "cityDisplay": "Ha Noi"
}
```

**Lấy danh sách thiết bị:**

```bash
GET /api/devices
```

---

## 🔌 Socket.io Events

**Frontend listen:**

```javascript
// City-specific channel
socket.on(`sensor-Hanoi`, (data) => {
  console.log('Hanoi data:', data.temperature, data.humidity);
});

// General broadcast (tất cả cities)
socket.on('sensor-data', (data) => {
  console.log('Any city data:', data);
});

// Connection status
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
```

---

## 🏗️ Kiến trúc dữ liệu

### Device Schema

```javascript
{
  deviceId: String,           // Unique ID
  name: String,               // Tên thiết bị
  cityKey: String,            // Khóa chuẩn hóa (Hanoi, Ho Chi Minh City)
  cityDisplay: String,        // Tên hiển thị (Ha Noi, Ho Chi Minh)
  registeredAt: Date,         // Ngày đăng ký
}
```

### SensorData Schema

```javascript
{
  cityKey: String,            // Khóa chuẩn hóa
  cityDisplay: String,        // Tên hiển thị
  temperature: Number,        // Độ C
  humidity: Number,           // %
  timestamp: Date,            // ISO 8601
  // TTL Index: TTL = 60*60*24*30 (30 ngày)
}
```

---

## 🔄 Data Flow

```
Device Simulator
        ↓
   (MQTT:1883)
        ↓
   Backend Server
        ↓
   (MongoDB)  (Socket.io)
        ↓           ↓
    Persist     Frontend
        ↓           ↓
   Chart Data   Real-time Display
```

---

## ⚙️ Cấu hình chi tiết

### Backend (server.js)

```javascript
const MQTT_BROKER = 'mqtt://localhost:1883';
const MQTT_TOPIC = 'iot/sensor/data';
const mongoURI = 'mongodb://localhost:27017/iot_db';
const PORT = 3000;

// City normalization
const cityMap = {
  'Hanoi': { key: 'Hanoi', display: 'Ha Noi' },
  'HCMC': { key: 'Ho Chi Minh City', display: 'Ho Chi Minh' },
  'Da Nang': { key: 'Da Nang', display: 'Da Nang' }
};
```

### Frontend (App.js)

```javascript
const SOCKET_SERVER = 'http://localhost:3000';
const cityOptions = [
  { key: 'Hanoi', display: 'Ha Noi' },
  { key: 'Ho Chi Minh City', display: 'Ho Chi Minh' },
  { key: 'Da Nang', display: 'Da Nang' }
];
```

---

## 🎨 Tùy chỉnh UI

### Tailwind CSS

Chỉnh sửa `frontend/tailwind.config.js`:

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        manrope: ['Manrope', 'sans-serif']
      }
    }
  },
  plugins: [],
}
```

### Custom Colors

Chỉnh sửa `frontend/src/App.css`:

```css
:root {
  --theme-green: #2ecc71;   /* Humidity color */
  --theme-yellow: #f1c40f;  /* Temperature color */
  --bg-soft: #fbfffb;
}
```

---

## 🚨 Troubleshooting

### ❌ "Không thể kết nối đến backend"

```bash
# Kiểm tra backend có chạy
curl http://localhost:3000/api/devices

# Nếu lỗi, khởi động backend:
cd backend && npm start
```

### ❌ "MongoDB Connection Error"

```bash
# Kiểm tra MongoDB chạy:
mongosh  # MongoDB shell

# Hoặc dùng MongoDB Compass (GUI)
# mongodb://localhost:27017
```

### ❌ "MQTT Connection Failed"

```bash
# Nếu không cần device simulator, skip phần này
# Hoặc cài Mosquitto:
# Windows: https://mosquitto.org/download/
# Mac: brew install mosquitto
# Linux: sudo apt install mosquitto
```

### ❌ "Port 3002 already in use"

```bash
# Tìm process dùng port:
netstat -ano | findstr :3002

# Kill process (Windows):
taskkill /PID <PID> /F

# Frontend sẽ auto dùng port tiếp theo (3003, 3004...)
```

---

## 📊 Thống kê

- **Backend**: Express.js + Socket.io + Mongoose + MQTT
- **Frontend**: React + Tailwind CSS + Recharts + Lucide Icons
- **Database**: MongoDB + TTL Indexes
- **Real-time**: Socket.io + MQTT
- **Lines of Code**: ~500 (core functionality)

---

## 🔐 Bảo mật (Nâng cao)

Để deploy production, thêm:

```javascript
// backend/server.js

// 1. API Key Authentication
const authenticateAPI = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// 2. CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3002',
  credentials: true
}));

// 3. Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api/', limiter);
```

---

## 🎓 Học thêm

- [Socket.io Docs](https://socket.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Recharts](https://recharts.org/)
- [MQTT Protocol](http://mqtt.org/)
- [MongoDB TTL Indexes](https://docs.mongodb.com/manual/core/index-ttl/)

---

## 📝 License

MIT

---

## 👨‍💻 Góp ý & Báo lỗi

Nếu tìm thấy lỗi hoặc có góp ý, vui lòng tạo issue hoặc pull request.

---

## 🌟 Stars

Nếu bạn thấy hữu ích, vui lòng sao ⭐ dự án này!

**Happy Monitoring! 🚀**

---

**Phiên bản**: 1.0.0  
**Cập nhật lần cuối**: 07/02/2026  
**Tác giả**: IoT Development Team
node -v
npm -v

