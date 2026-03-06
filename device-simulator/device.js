const mqtt = require('mqtt');
const axios = require('axios');

const API_KEY = '94851f3a7565d13c8f4a3700705bd32c';

const client = mqtt.connect(process.env.MQTT_URL || 'mqtt://localhost:1883');

// Danh sách thành phố Việt Nam
const cities = [
  { name: 'Hanoi', deviceId: 'sensor_hanoi' },
  { name: 'Da Nang', deviceId: 'sensor_danang' },
  { name: 'Ho Chi Minh City', deviceId: 'sensor_hcm' }
];

client.on('connect', () => {
  console.log('✅ Device connected to MQTT broker');

  setInterval(async () => {
    for (let city of cities) {
      try {

        const res = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${city.name}&units=metric&appid=${API_KEY}`
        );

        const data = {
          deviceId: city.deviceId,
          city: city.name,
          temperature: res.data.main.temp,
          humidity: res.data.main.humidity,
          timestamp: new Date()
        };

        client.publish('iot/sensor/data', JSON.stringify(data));

        console.log('📤 Sent:', data);

      } catch (err) {
        console.log('❌ Error fetching weather:', err.message);
      }
    }
  }, 5000);
});
