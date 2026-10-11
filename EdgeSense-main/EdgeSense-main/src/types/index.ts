// ============================================================
// EdgeSense — Core Type Definitions
// ============================================================

// ── System Status ──
export type ConnectionStatus = 'online' | 'offline' | 'simulated' | 'stale' | 'error' | 'connecting';
export type DataSource = 'hardware' | 'simulated' | 'cached';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface SystemStatus {
  backend: ConnectionStatus;
  esp32: ConnectionStatus;
  bluetooth: ConnectionStatus;
  internet: ConnectionStatus;
  demoMode: boolean;
  lastUpdate: string | null;
}

// ── Sensor Readings ──
export interface SensorReading {
  id?: number;
  timestamp: string;
  sensor_type: SensorType;
  value: number;
  unit: string;
  source: DataSource;
  is_valid: boolean;
  quality?: number; // 0-100
}

export type SensorType = 
  | 'temperature' 
  | 'humidity' 
  | 'brightness' 
  | 'lux'
  | 'motion' 
  | 'presence' 
  | 'voltage' 
  | 'current' 
  | 'power' 
  | 'energy'
  | 'sound_level';

export interface SensorState {
  temperature: SensorReading | null;
  humidity: SensorReading | null;
  brightness: SensorReading | null;
  motion: SensorReading | null;
  presence: SensorReading | null;
  voltage: SensorReading | null;
  current: SensorReading | null;
  power: SensorReading | null;
  energy: SensorReading | null;
}

// ── Device Control ──
export type DeviceType = 'light' | 'fan' | 'sensor_module' | 'controller' | 'display';
export type DeviceState = 'on' | 'off' | 'unknown' | 'error';
export type OperatingMode = 'auto' | 'manual';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  state: DeviceState;
  mode: OperatingMode;
  lastStateChange: string | null;
  lastCommandAck: string | null;
  runtimeHours: number;
  totalCycles: number;
  source: DataSource;
}

export interface DeviceCommand {
  id?: number;
  device_id: string;
  command: string;
  payload?: Record<string, unknown>;
  timestamp: string;
  acknowledged: boolean;
  ack_timestamp?: string | null;
  success: boolean;
  error_message?: string | null;
  source: DataSource;
}

// ── Alerts ──
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertState = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: number;
  title: string;
  message: string;
  severity: AlertSeverity;
  state: AlertState;
  source: string;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  rule_id?: number | null;
  cooldown_until?: string | null;
}

export interface AlertRule {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  condition_type: string;
  condition_sensor: SensorType;
  condition_operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'between' | 'outside';
  condition_value: number;
  condition_value2?: number;
  severity: AlertSeverity;
  cooldown_seconds: number;
  created_at: string;
  last_triggered?: string | null;
}

// ── Energy ──
export interface EnergyReading {
  timestamp: string;
  voltage: number | null;
  current: number | null;
  power: number | null;
  energy_wh: number | null;
  source: DataSource;
}

export interface EnergySummary {
  total_kwh: number;
  estimated_cost: number;
  avg_power_w: number;
  peak_power_w: number;
  device_runtimes: Record<string, number>;
  period: string;
  source: DataSource;
}

// ── Analytics ──
export interface AnalyticsSummary {
  period: string;
  data_coverage_pct: number;
  temperature: TrendSummary | null;
  humidity: TrendSummary | null;
  brightness: TrendSummary | null;
  motion_events: number;
  presence_pct: number;
  device_usage: Record<string, DeviceUsageSummary>;
  insights: Insight[];
}

export interface TrendSummary {
  min: number;
  max: number;
  avg: number;
  stddev: number;
  trend: 'rising' | 'falling' | 'stable' | 'insufficient_data';
  data_points: number;
}

export interface DeviceUsageSummary {
  total_runtime_hours: number;
  total_cycles: number;
  avg_daily_hours: number;
  peak_hour: number;
}

export interface Insight {
  id: string;
  text: string;
  category: string;
  confidence: number;
  data_period: string;
  method: string;
}

// ── Predictive Maintenance ──
export type HealthStatus = 'healthy' | 'monitor' | 'maintenance_recommended' | 'high_risk' | 'insufficient_data';

export interface DeviceHealth {
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  status: HealthStatus;
  health_score: number; // 0-100
  runtime_hours: number;
  expected_lifetime_hours: number;
  estimated_remaining_hours: number | null;
  estimated_remaining_pct: number | null;
  confidence: number; // 0-100
  factors: HealthFactor[];
  last_maintenance: string | null;
  recommended_action: string;
  prediction_method: string;
  assumptions: string[];
  last_updated: string;
}

export interface HealthFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  weight: number;
}

// ── Activity History ──
export interface ActivityEvent {
  id: number;
  event_type: string;
  source: string;
  description: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// ── Voice ──
export interface VoiceState {
  isListening: boolean;
  isMicConnected: boolean;
  lastTranscript: string;
  lastCommand: string;
  lastConfidence: number;
  commandHistory: VoiceCommand[];
  error: string | null;
}

export interface VoiceCommand {
  id: number;
  transcript: string;
  matched_command: string;
  confidence: number;
  executed: boolean;
  result: string;
  timestamp: string;
}

// ── Hardware ──
export interface HardwareConfig {
  serial_port: string;
  baud_rate: number;
  connected: boolean;
  firmware_version: string | null;
  protocol_version: string | null;
  last_heartbeat: string | null;
  sensors_detected: string[];
  bluetooth_enabled: boolean;
  bluetooth_address: string | null;
}

// ── Settings ──
export interface AppSettings {
  // Appearance
  theme: ThemeMode;
  animation_intensity: 'full' | 'reduced' | 'none';
  reduced_motion: boolean;
  
  // Monitoring
  sampling_interval_seconds: number;
  chart_default_window: '15m' | '1h' | '24h' | '7d' | '30d';
  stale_threshold_seconds: number;
  temperature_unit: 'celsius' | 'fahrenheit';
  
  // Devices
  serial_port: string;
  baud_rate: number;
  connection_timeout_seconds: number;
  retry_max_attempts: number;
  retry_backoff_seconds: number;
  
  // Alerts
  alert_cooldown_seconds: number;
  
  // Energy
  electricity_tariff: number;
  currency: string;
  
  // Prediction
  light_expected_hours: number;
  fan_expected_hours: number;
  sensor_expected_hours: number;
  prediction_min_data_hours: number;
  
  // Data
  data_retention_days: number;
  auto_backup: boolean;
  backup_interval_hours: number;
}

// ── API Response ──
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ── Chart Data ──
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  sensor_type: SensorType;
  points: ChartDataPoint[];
  unit: string;
  period: string;
}

// ── Notification ──
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  action?: string;
}
