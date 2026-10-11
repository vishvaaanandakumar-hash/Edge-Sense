// ============================================================
// EdgeSense — Backend Server (Express + Socket.IO)
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
  path: '/socket.io',
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../dist');

// State in memory
let demoMode = true;
let systemStatus = {
  backend: 'online',
  esp32: 'simulated',
  bluetooth: 'offline',
  internet: 'online',
  lastUpdate: new Date().toISOString(),
};

let currentSensors = {
  temperature: { value: 24.5, unit: '°C', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
  humidity: { value: 55.0, unit: '%', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
  brightness: { value: 340, unit: 'lux', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
  motion: { value: 0, unit: '', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
  presence: { value: 1, unit: '', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
  voltage: { value: 12.1, unit: 'V', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
  current: { value: 0.45, unit: 'A', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
  power: { value: 5.44, unit: 'W', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
  energy: { value: 0.12, unit: 'kWh', is_valid: true, source: 'simulated', timestamp: new Date().toISOString() },
};

let devices = [
  { id: 'light-1', name: 'Room Light', type: 'light', state: 'off', speed: 0, source: 'simulated', lastStateChange: new Date().toISOString() },
  { id: 'fan-1', name: 'Room Fan', type: 'fan', state: 'on', speed: 2, source: 'simulated', lastStateChange: new Date().toISOString() },
];

let alerts = [
  {
    id: 1,
    title: 'High Temperature Warning',
    message: 'Room temperature reached 28.5°C',
    severity: 'warning',
    state: 'active',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

let alertRules = [
  { id: 1, name: 'High Temperature Alert', sensor: 'temperature', condition: 'greater_than', threshold: 30, severity: 'warning', enabled: true },
  { id: 2, name: 'Unexpected Motion', sensor: 'motion', condition: 'equals', threshold: 1, severity: 'critical', enabled: true },
];

let settings = {
  currency: '$',
  electricity_tariff: 0.15,
  temperature_unit: 'C',
  auto_theme: true,
  reduced_motion: false,
  animation_intensity: 'full',
  esp32_baud: 115200,
  esp32_port: 'COM3',
};

let historyLogs = [
  { id: 1, type: 'device', description: 'Room Fan turned ON', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 2, type: 'alert', description: 'High Temperature Warning triggered', timestamp: new Date(Date.now() - 3600000).toISOString() },
];

let voiceHistory = [
  { id: 1, command: 'turn on light', response: 'Room light turned ON', status: 'success', timestamp: new Date(Date.now() - 500000).toISOString() },
];

// Generate periodic simulation data
setInterval(() => {
  const now = new Date().toISOString();
  currentSensors.temperature.value = +(22 + Math.sin(Date.now() / 10000) * 4 + (Math.random() * 0.4 - 0.2)).toFixed(1);
  currentSensors.humidity.value = +(50 + Math.cos(Date.now() / 12000) * 8 + (Math.random() * 0.6 - 0.3)).toFixed(1);
  currentSensors.brightness.value = Math.max(0, Math.round(300 + Math.sin(Date.now() / 15000) * 150 + Math.random() * 20));
  currentSensors.motion.value = Math.random() > 0.85 ? 1 : 0;
  currentSensors.voltage.value = +(12.0 + Math.random() * 0.3 - 0.15).toFixed(2);

  const isLightOn = devices.find(d => d.id === 'light-1')?.state === 'on';
  const isFanOn = devices.find(d => d.id === 'fan-1')?.state === 'on';
  const fanSpeed = devices.find(d => d.id === 'fan-1')?.speed || 1;

  const currentVal = (isLightOn ? 0.3 : 0.05) + (isFanOn ? 0.25 * fanSpeed : 0);
  currentSensors.current.value = +currentVal.toFixed(2);
  currentSensors.power.value = +(currentSensors.voltage.value * currentSensors.current.value).toFixed(2);
  currentSensors.energy.value = +(currentSensors.energy.value + currentSensors.power.value / 3600000).toFixed(4);

  currentSensors.temperature.timestamp = now;
  currentSensors.humidity.timestamp = now;
  currentSensors.brightness.timestamp = now;
  currentSensors.motion.timestamp = now;
  currentSensors.presence.timestamp = now;
  currentSensors.voltage.timestamp = now;
  currentSensors.current.timestamp = now;
  currentSensors.power.timestamp = now;
  currentSensors.energy.timestamp = now;

  systemStatus.lastUpdate = now;

  io.emit('sensor_update', currentSensors);
  io.emit('system_status', systemStatus);
}, 2000);

// API Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/system/status', (req, res) => res.json({ data: systemStatus }));

app.get('/api/sensors/current', (req, res) => res.json({ data: currentSensors }));
app.get('/api/sensors/history/:sensorType', (req, res) => {
  const { sensorType } = req.params;
  const count = 20;
  const data = [];
  const baseValue = currentSensors[sensorType]?.value ?? 25;
  const now = Date.now();
  for (let i = count - 1; i >= 0; i--) {
    data.push({
      timestamp: new Date(now - i * 180000).toISOString(),
      value: typeof baseValue === 'number' ? +(baseValue + (Math.random() * 2 - 1)).toFixed(1) : 1,
    });
  }
  res.json({ data });
});

app.get('/api/devices', (req, res) => res.json({ data: devices }));
app.post('/api/devices/:id/control', (req, res) => {
  const { id } = req.params;
  const { command, speed } = req.body;
  const device = devices.find(d => d.id === id);

  if (!device) return res.status(404).json({ error: 'Device not found' });

  if (command === 'on' || command === 'off') {
    device.state = command;
  } else if (command === 'toggle') {
    device.state = device.state === 'on' ? 'off' : 'on';
  }
  if (speed !== undefined) device.speed = speed;
  device.lastStateChange = new Date().toISOString();

  historyLogs.unshift({
    id: Date.now(),
    type: 'device',
    description: `${device.name} turned ${device.state.toUpperCase()}`,
    timestamp: new Date().toISOString(),
  });

  io.emit('device_update', { devices, device_id: id });
  res.json({ success: true, data: device });
});

app.get('/api/alerts', (req, res) => {
  const { state } = req.query;
  const filtered = state ? alerts.filter(a => a.state === state) : alerts;
  res.json({ data: filtered });
});

app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const alert = alerts.find(a => a.id === Number(req.params.id));
  if (alert) alert.state = 'acknowledged';
  res.json({ success: true, data: alert });
});

app.post('/api/alerts/:id/resolve', (req, res) => {
  const alert = alerts.find(a => a.id === Number(req.params.id));
  if (alert) alert.state = 'resolved';
  res.json({ success: true, data: alert });
});

app.get('/api/alerts/rules', (req, res) => res.json({ data: alertRules }));
app.post('/api/alerts/rules', (req, res) => {
  const newRule = { id: Date.now(), ...req.body };
  alertRules.push(newRule);
  res.json({ success: true, data: newRule });
});
app.put('/api/alerts/rules/:id', (req, res) => {
  const index = alertRules.findIndex(r => r.id === Number(req.params.id));
  if (index !== -1) alertRules[index] = { ...alertRules[index], ...req.body };
  res.json({ success: true, data: alertRules[index] });
});
app.delete('/api/alerts/rules/:id', (req, res) => {
  alertRules = alertRules.filter(r => r.id !== Number(req.params.id));
  res.json({ success: true });
});

app.get('/api/energy', (req, res) => {
  const power_history = [];
  const now = Date.now();
  for (let i = 12; i >= 0; i--) {
    power_history.push({
      timestamp: new Date(now - i * 3600000).toISOString(),
      power: +(4.5 + Math.random() * 3).toFixed(1),
    });
  }
  res.json({
    data: {
      power_history,
      estimated_cost: +(currentSensors.energy.value * settings.electricity_tariff).toFixed(2),
      device_runtimes: { 'Room Light': 4.5, 'Room Fan': 8.2 },
      daily_comparison: [
        { date: 'Mon', energy_wh: 120 },
        { date: 'Tue', energy_wh: 150 },
        { date: 'Wed', energy_wh: 140 },
        { date: 'Thu', energy_wh: 160 },
        { date: 'Fri', energy_wh: 130 },
        { date: 'Sat', energy_wh: 180 },
        { date: 'Sun', energy_wh: 110 },
      ],
      recommendations: [
        { text: 'Turn off lights when room is unoccupied', potential_saving: '15%' },
        { text: 'Reduce fan speed when temperature is under 25°C', potential_saving: '10%' },
      ],
    }
  });
});

app.get('/api/devices/health', (req, res) => {
  res.json({
    data: [
      { device_id: 'light-1', device_name: 'Room Light', health_score: 95, status: 'healthy', issue: 'None' },
      { device_id: 'fan-1', device_name: 'Room Fan', health_score: 88, status: 'good', issue: 'Slight motor vibration' },
    ]
  });
});

app.get('/api/history', (req, res) => res.json({ data: historyLogs }));
app.get('/api/history/export', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.attachment('edgesense_history.csv');
  res.send('timestamp,type,description\n' + historyLogs.map(l => `${l.timestamp},${l.type},"${l.description}"`).join('\n'));
});

app.get('/api/settings', (req, res) => res.json({ data: settings }));
app.put('/api/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  res.json({ success: true, data: settings });
});

app.get('/api/hardware/status', (req, res) => res.json({ data: { connected: false, port: settings.esp32_port } }));
app.get('/api/hardware/ports', (req, res) => res.json({ data: ['COM1', 'COM3', '/dev/ttyUSB0'] }));
app.post('/api/hardware/connect', (req, res) => res.json({ success: true, message: 'Simulated connection successful' }));
app.post('/api/hardware/disconnect', (req, res) => res.json({ success: true }));

app.post('/api/demo/toggle', (req, res) => {
  demoMode = req.body.enabled ?? true;
  systemStatus.esp32 = demoMode ? 'simulated' : 'offline';
  res.json({ success: true, demoMode });
});

app.get('/api/voice/history', (req, res) => res.json({ data: voiceHistory }));

app.use(express.static(frontendDistPath));
app.get(/^(?!\/api(?:\/|$)|\/socket\.io(?:\/|$)).*$/, (req, res, next) => {
  if (!req.accepts('html')) return next();
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`[EdgeSense Server] Running on http://localhost:${PORT}`);
});
