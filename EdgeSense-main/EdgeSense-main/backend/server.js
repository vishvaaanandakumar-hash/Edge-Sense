// ============================================================
// EdgeSense — Backend Server (Express + Socket.IO)
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
const runtimeHistoryPath = path.join(__dirname, 'device-runtime.json');

// State in memory
let demoMode = true;
let systemStatus = {
  backend: 'online',
  esp32: 'simulated',
  bluetooth: 'offline',
  internet: 'online',
  demoMode: true,
  lastUpdate: new Date().toISOString(),
};

let lastHardwareTelemetryAt = 0;
let lastHardwareEnergyAt = 0;
let hardwareEnergyKwh = 0;
let hardwareCommands = [];
let noPresenceSince = null;
let noPresenceAlertTimer = null;
let noPresenceShutdownTimer = null;
let noPresenceAlertId = null;

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
const hasRuntimeHistory = existsSync(runtimeHistoryPath);
let deviceRuntimeSessions = hasRuntimeHistory
  ? JSON.parse(readFileSync(runtimeHistoryPath, 'utf8'))
  : devices.filter(device => device.state === 'on').map(device => ({
    id: Date.now() + Math.random(),
    device_id: device.id,
    device_name: device.name,
    started_at: device.lastStateChange || new Date().toISOString(),
    ended_at: null,
  }));
if (!Array.isArray(deviceRuntimeSessions) || deviceRuntimeSessions.some(session =>
  !session || typeof session.device_id !== 'string' ||
  typeof session.device_name !== 'string' ||
  typeof session.started_at !== 'string' ||
  !Number.isFinite(Date.parse(session.started_at)) ||
  (session.ended_at !== null && (typeof session.ended_at !== 'string' || !Number.isFinite(Date.parse(session.ended_at))))
)) {
  throw new Error(`Invalid device runtime history in ${runtimeHistoryPath}`);
}
devices.forEach(device => {
  const deviceSessions = deviceRuntimeSessions
    .filter(session => session.device_id === device.id)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
  const latestSession = deviceSessions[deviceSessions.length - 1];
  if (latestSession) {
    device.state = latestSession.ended_at === null ? 'on' : 'off';
    device.lastStateChange = latestSession.ended_at || latestSession.started_at;
  }
});

const persistDeviceRuntimeSessions = () => {
  writeFileSync(runtimeHistoryPath, JSON.stringify(deviceRuntimeSessions, null, 2));
};
if (!hasRuntimeHistory) persistDeviceRuntimeSessions();

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
  esp32_baud: 921600,
  esp32_port: 'COM9',
};

let historyLogs = [
  { id: 1, type: 'device', description: 'Room Fan turned ON', timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: 2, type: 'alert', description: 'High Temperature Warning triggered', timestamp: new Date(Date.now() - 3600000).toISOString() },
];

let voiceHistory = [
  { id: 1, command: 'turn on light', response: 'Room light turned ON', status: 'success', timestamp: new Date(Date.now() - 500000).toISOString() },
];

const recordDeviceStateChange = (device, nextState, timestamp = new Date().toISOString(), description) => {
  if (device.state === nextState) return false;

  const activeSession = [...deviceRuntimeSessions].reverse().find(session =>
    session.device_id === device.id && session.ended_at === null
  );
  if (activeSession) activeSession.ended_at = timestamp;
  if (nextState === 'on') {
    deviceRuntimeSessions.push({
      id: Date.now() + Math.random(),
      device_id: device.id,
      device_name: device.name,
      started_at: timestamp,
      ended_at: null,
    });
  }

  device.state = nextState;
  device.lastStateChange = timestamp;
  historyLogs.unshift({
    id: Date.now() + Math.random(),
    type: 'device',
    description: description || `${device.name} turned ${nextState.toUpperCase()}`,
    timestamp,
  });
  persistDeviceRuntimeSessions();
  return true;
};

const localDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const localDayBounds = dateKey => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(year, month - 1, day + 1);
  return { start: start.getTime(), end: end.getTime() };
};

const getSessionDuration = (session, start, end, now) => {
  const sessionStart = new Date(session.started_at).getTime();
  const sessionEnd = session.ended_at ? new Date(session.ended_at).getTime() : now;
  return Math.max(0, Math.min(sessionEnd, end) - Math.max(sessionStart, start));
};

const cancelNoPresenceTimers = () => {
  clearTimeout(noPresenceAlertTimer);
  clearTimeout(noPresenceShutdownTimer);
  noPresenceAlertTimer = null;
  noPresenceShutdownTimer = null;
  noPresenceSince = null;
};

const resolveNoPresenceAlert = () => {
  if (noPresenceAlertId === null) return;
  const alert = alerts.find(item => item.id === noPresenceAlertId);
  if (alert && alert.state !== 'resolved') {
    alert.state = 'resolved';
    io.emit('alert_resolved', { id: alert.id });
  }
  noPresenceAlertId = null;
};

const hasFreshAbsentReading = () =>
  currentSensors.presence.is_valid &&
  currentSensors.presence.value === 0 &&
  Date.now() - lastHardwareTelemetryAt < 5000;

const trackPresence = (presence) => {
  if (!presence.is_valid) {
    cancelNoPresenceTimers();
    return;
  }

  if (presence.value > 0) {
    cancelNoPresenceTimers();
    resolveNoPresenceAlert();
    return;
  }

  if (presence.value !== 0 || noPresenceSince !== null) return;

  noPresenceSince = Date.now();
  const absenceStartedAt = noPresenceSince;
  noPresenceAlertTimer = setTimeout(() => {
    noPresenceAlertTimer = null;
    if (noPresenceSince !== absenceStartedAt || !hasFreshAbsentReading()) return;

    const activeDevices = devices.filter(device =>
      (device.type === 'light' || device.type === 'fan') && device.state === 'on'
    );
    if (activeDevices.length === 0 || noPresenceAlertId !== null) return;

    const alert = {
      id: Date.now(),
      title: 'Room Unoccupied While Devices Are Running',
      message: 'No presence has been detected for 20 seconds. Running devices will switch off after 30 seconds of continued absence.',
      severity: 'warning',
      state: 'active',
      created_at: new Date().toISOString(),
      source: 'presence automation',
    };
    alerts.unshift(alert);
    noPresenceAlertId = alert.id;
    io.emit('alert', alert);
  }, 20000);

  noPresenceShutdownTimer = setTimeout(() => {
    noPresenceShutdownTimer = null;
    if (noPresenceSince !== absenceStartedAt || !hasFreshAbsentReading()) return;

    const activeDevices = devices.filter(device =>
      (device.type === 'light' || device.type === 'fan') && device.state === 'on'
    );
    if (activeDevices.length === 0) return;

    if (demoMode) {
      const now = new Date().toISOString();
      activeDevices.forEach(device => {
        recordDeviceStateChange(
          device,
          'off',
          now,
          `${device.name} automatically turned OFF after the room was unoccupied`
        );
      });
      io.emit('device_update', { devices });
      return;
    }

    if (hardwareCommands.length + activeDevices.length > 50) return;
    const queuedAt = new Date().toISOString();
    activeDevices.forEach(device => {
      hardwareCommands.push({
        command: `${device.type.toUpperCase()} OFF`,
        device_id: device.id,
        queued_at: queuedAt,
        source: 'presence_automation',
      });
    });
  }, 30000);
};

io.on('connection', socket => {
  socket.emit('sensor_update', currentSensors);
  socket.emit('system_status', systemStatus);
});

// Generate periodic simulation data
setInterval(() => {
  const now = new Date().toISOString();
  if (demoMode) {
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

    io.emit('sensor_update', currentSensors);
  } else if (Date.now() - lastHardwareTelemetryAt > 5000) {
    systemStatus.esp32 = 'offline';
    cancelNoPresenceTimers();
  }

  systemStatus.lastUpdate = now;
  io.emit('system_status', systemStatus);
}, 2000);

// API Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/system/status', (req, res) => res.json({ data: systemStatus }));

app.get('/api/sensors/current', (req, res) => res.json({ data: currentSensors }));
app.post('/api/hardware/telemetry', (req, res) => {
  const telemetry = req.body;
  if (!telemetry || typeof telemetry !== 'object' || Array.isArray(telemetry)) {
    return res.status(400).json({ error: 'Telemetry must be a JSON object' });
  }

  const now = new Date().toISOString();
  const reading = (value, unit) => {
    const numericValue = Number(value);
    const isValid = Number.isFinite(numericValue) && numericValue >= 0;
    return {
      value: isValid ? numericValue : null,
      unit,
      is_valid: isValid,
      source: 'hardware',
      timestamp: now,
    };
  };
  const flagValue = value => value === true || value === 1 ? 1 : 0;
  const telemetryValue = (...keys) => {
    const key = keys.find(candidate => Object.prototype.hasOwnProperty.call(telemetry, candidate));
    return key === undefined ? undefined : telemetry[key];
  };

  const temperature = reading(telemetryValue('temperature', 'temperature_c'), '°C');
  const humidity = reading(telemetryValue('humidity', 'humidity_pct'), '%');
  const roomBright = telemetryValue('room_bright');
  const ldr = telemetryValue('ldr', 'brightness');
  const brightness = roomBright === undefined
    ? reading(ldr, 'ADC')
    : reading(roomBright ? 1 : 0, 'state');
  const presenceValue = telemetryValue('presence', 'presence_detected', 'room_presence');
  const motionValue = telemetryValue('moving_detected', 'presence_motion');
  const presenceFlag = presenceValue === true || presenceValue === 1
    ? 1
    : presenceValue === false || presenceValue === 0 ? 0 : undefined;
  const presence = reading(presenceFlag, '');
  const motion = reading(motionValue === undefined ? undefined : flagValue(motionValue), '');
  const voltage = reading(telemetryValue('voltage', 'bus_voltage_v'), 'V');
  const current = reading(Number(telemetryValue('current_mA', 'current_ma')) / 1000, 'A');
  const power = reading(Number(telemetryValue('power_mW', 'power_mw')) / 1000, 'W');
  const elapsedMs = lastHardwareEnergyAt ? Date.now() - lastHardwareEnergyAt : 0;
  if (power.is_valid && elapsedMs > 0) {
    hardwareEnergyKwh += power.value * elapsedMs / 3600000000;
  }
  lastHardwareEnergyAt = Date.now();

  currentSensors = {
    ...currentSensors,
    temperature,
    humidity,
    brightness,
    motion,
    presence,
    voltage,
    current,
    power,
    energy: reading(hardwareEnergyKwh, 'kWh'),
  };

  for (const [deviceType, telemetryKey] of [['light', 'light'], ['fan', 'fan']]) {
    const device = devices.find(item => item.type === deviceType);
    const deviceState = telemetryValue(telemetryKey, `${telemetryKey}_on`);
    if (!device || typeof deviceState !== 'boolean') continue;
    const nextState = deviceState ? 'on' : 'off';
    recordDeviceStateChange(device, nextState, now);
    device.source = 'hardware';
  }

  const serialPort = req.get('x-edgesense-port');
  if (serialPort) settings.esp32_port = serialPort;
  lastHardwareTelemetryAt = Date.now();
  demoMode = false;
  systemStatus.esp32 = 'online';
  systemStatus.demoMode = false;
  systemStatus.lastUpdate = now;
  trackPresence(presence);

  io.emit('sensor_update', currentSensors);
  io.emit('device_update', { devices });
  io.emit('system_status', systemStatus);
  io.emit('hardware_status', { esp32: 'online' });

  res.json({ success: true, received_at: now });
});
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
app.get('/api/devices/runtime', (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : localDateKey(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date must use YYYY-MM-DD format' });
  }

  const [year, month, day] = date.split('-').map(Number);
  if (localDateKey(new Date(year, month - 1, day)) !== date) {
    return res.status(400).json({ error: 'Date is not valid' });
  }

  const now = Date.now();
  const { start, end } = localDayBounds(date);
  const runtimeDevices = devices.filter(device => device.type === 'light' || device.type === 'fan');
  const sessions = deviceRuntimeSessions
    .filter(session => runtimeDevices.some(device => device.id === session.device_id))
    .map(session => ({
      ...session,
      duration_ms: getSessionDuration(session, start, end, now),
    }))
    .filter(session => session.duration_ms > 0)
    .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

  const daily_totals = [];
  for (let offset = 6; offset >= 0; offset--) {
    const currentDate = new Date(year, month - 1, day - offset);
    const dateKey = localDateKey(currentDate);
    const bounds = localDayBounds(dateKey);
    for (const device of runtimeDevices) {
      const duration_ms = deviceRuntimeSessions.reduce((total, session) => {
        if (session.device_id !== device.id) return total;
        return total + getSessionDuration(session, bounds.start, bounds.end, now);
      }, 0);
      daily_totals.push({
        date: dateKey,
        device_id: device.id,
        device_name: device.name,
        duration_ms,
      });
    }
  }

  res.json({ data: { date, daily_totals, sessions } });
});
app.get('/api/hardware/commands', (req, res) => {
  res.json({ commands: hardwareCommands.splice(0) });
});
app.post('/api/devices/:id/control', (req, res) => {
  const { id } = req.params;
  const { command, speed } = req.body;
  const device = devices.find(d => d.id === id);

  if (!device) return res.status(404).json({ error: 'Device not found' });

  const desiredState = command === 'toggle'
    ? device.state === 'on' ? 'off' : 'on'
    : command;
  if (desiredState !== 'on' && desiredState !== 'off') {
    return res.status(400).json({ error: 'Command must be on, off, or toggle' });
  }

  if (!demoMode && (device.type === 'light' || device.type === 'fan')) {
    if (Date.now() - lastHardwareTelemetryAt >= 5000) {
      return res.status(503).json({ error: 'ESP32 serial bridge is offline' });
    }
    if (hardwareCommands.length >= 50) {
      return res.status(503).json({ error: 'Hardware command queue is full' });
    }

    hardwareCommands.push({
      command: `${device.type.toUpperCase()} ${desiredState.toUpperCase()}`,
      device_id: id,
      queued_at: new Date().toISOString(),
    });
    return res.json({ success: true, pending: true, desired_state: desiredState });
  }

  recordDeviceStateChange(device, desiredState);
  if (speed !== undefined) device.speed = speed;

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

app.get('/api/hardware/status', (req, res) => res.json({
  data: {
    connected: Date.now() - lastHardwareTelemetryAt < 5000,
    port: settings.esp32_port,
    baud_rate: settings.esp32_baud,
  },
}));
app.get('/api/hardware/ports', (req, res) => res.json({ data: [settings.esp32_port] }));
app.post('/api/hardware/connect', (req, res) => res.json({ success: true, message: 'Simulated connection successful' }));
app.post('/api/hardware/disconnect', (req, res) => res.json({ success: true }));

app.post('/api/demo/toggle', (req, res) => {
  demoMode = req.body.enabled ?? true;
  systemStatus.esp32 = demoMode ? 'simulated' : 'offline';
  systemStatus.demoMode = demoMode;
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
