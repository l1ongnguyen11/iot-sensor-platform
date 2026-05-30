# 🌦 IoT Weather Monitoring Platform

Realtime IoT weather monitoring dashboard built with MQTT, MongoDB, Socket.io and React.

---

## 🚀 Features

* Realtime weather monitoring
* Multi-city support
* MQTT communication
* Realtime dashboard updates
* Temperature & humidity charts
* MongoDB data storage
* Socket.io realtime communication

---

## 🛠 Tech Stack

### Frontend

* ReactJS
* Chart.js
* Socket.io Client

### Backend

* Node.js
* Express.js
* Socket.io
* MQTT

### Database

* MongoDB
* Mongoose

---

## 📡 System Architecture

OpenWeather API
→ Device Simulator
→ MQTT Broker
→ Backend Server
→ MongoDB
→ Socket.io
→ React Dashboard

---

## Project Overview

This project simulates and displays realtime weather sensor data (temperature and humidity) for multiple cities. Data flows from a device simulator -> MQTT broker -> backend -> MongoDB -> Socket.io -> React dashboard.

## Architecture

- Device Simulator: publishes sensor data to MQTT
- MQTT Broker: message transport (mosquitto)
- Backend: subscribes to MQTT, saves to MongoDB, broadcasts via Socket.io
- Frontend: React dashboard subscribes to Socket.io and renders charts and alerts

## Screenshots

See `assets/dashboard.png` for a screenshot of the dashboard UI.

## API Endpoints

The backend exposes simple HTTP endpoints (examples):

- `GET /api/health` — health check
- `GET /api/devices` — list devices
- `GET /api/data?deviceId=...&limit=50` — recent sensor data


## 🌍 Supported Cities

* Hanoi
* Da Nang
* Ho Chi Minh City

---

## ⚙️ Installation

### 1. Clone repository

```bash
git clone https://github.com/l1ongnguyen11/iot-sensor-platform
```

---

### 2. Install dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd frontend
npm install
```

#### Device Simulator

```bash
cd device-simulator
npm install
```

---

### 3. Start MongoDB

```bash
mongod
```

---

### 4. Start MQTT Broker

```bash
mosquitto
```

---

### 5. Run backend

```bash
cd backend
npm start
```

---

### 6. Run frontend

```bash
cd frontend
npm start
```

---

### 7. Run device simulator

```bash
cd device-simulator
node simulator.js
```

---

## 📷 Dashboard Preview

Realtime monitoring dashboard with:
![Dashboard](./assets/dashboard.png)
* city selection
* realtime sensor updates
* temperature & humidity charts

---

## 🔥 Future Improvements

* Authentication system
* Alert notifications
* Docker deployment
* Dark mode
* Historical analytics
* Mobile responsive UI

---

## 👨‍💻 Author

Nguyen Trung Long
