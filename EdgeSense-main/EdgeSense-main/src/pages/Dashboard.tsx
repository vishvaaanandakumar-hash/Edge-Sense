// ============================================================
// EdgeSense — Overview Dashboard (Feature #1)
// ============================================================

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Thermometer, Droplets, Sun, Move, Eye, Lightbulb,
  Fan, Activity, Clock, AlertTriangle, HeartPulse,
  TrendingUp, Wifi, WifiOff, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useSensorStore, useSystemStore, useDeviceStore, useAlertStore, useDeviceHealthStore } from '@/store';
import {
  StaggerContainer, StaggerItem, AnimatedNumber, DataPulse,
  ChartReveal, HealthRing, Skeleton, SkeletonCard, PageTransition,
  AmbientGlow,
} from '@/components/animations';
import api from '@/utils/api';

// Metric Card Component
const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string | null;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'online' | 'offline' | 'simulated' | 'stale' | 'error';
  subtitle?: string;
  color?: string;
  id: string;
}> = ({ icon, label, value, unit, trend, status, subtitle, color = 'var(--es-orange)', id }) => {
  const isLoading = value === null || value === undefined;

  return (
    <div className="es-card" id={id} style={{ position: 'relative' }}>
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        opacity: 0.6,
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 'var(--radius-md)',
            background: `${color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {label}
          </span>
        </div>
        {status && (
          <DataPulse
            active={status === 'online' || status === 'simulated'}
            color={status === 'online' ? 'var(--es-success)' : status === 'simulated' ? 'var(--es-warning)' : 'var(--es-grey-dark)'}
            size={8}
          />
        )}
      </div>

      {isLoading ? (
        <Skeleton height={32} width="50%" />
      ) : (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
            {typeof value === 'number' ? (
              <AnimatedNumber value={value} decimals={value % 1 !== 0 ? 1 : 0} />
            ) : (
              value
            )}
          </span>
          {unit && (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {unit}
            </span>
          )}
          {trend && (
            <span style={{
              display: 'flex', alignItems: 'center',
              color: trend === 'up' ? 'var(--es-error)' : trend === 'down' ? 'var(--es-success)' : 'var(--text-tertiary)',
              fontSize: '0.75rem',
            }}>
              {trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : null}
            </span>
          )}
        </div>
      )}

      {subtitle && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.375rem' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

// Device Status Card
const DeviceCard: React.FC<{
  icon: React.ReactNode;
  name: string;
  isOn: boolean;
  source: string;
  lastChange?: string;
  id: string;
}> = ({ icon, name, isOn, source, lastChange, id }) => (
  <div className="es-card" id={id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{
      width: 42, height: 42,
      borderRadius: 'var(--radius-md)',
      background: isOn ? 'var(--es-orange-glow-strong)' : 'var(--bg-hover)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: isOn ? 'var(--es-orange)' : 'var(--text-tertiary)',
      transition: 'all var(--transition-base)',
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{name}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
        {source === 'simulated' ? 'Simulated' : lastChange ? `Since ${new Date(lastChange).toLocaleTimeString()}` : 'Unknown'}
      </div>
    </div>
    <div style={{
      padding: '0.25rem 0.75rem',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.75rem',
      fontWeight: 600,
      background: isOn ? 'var(--es-success-glow)' : 'var(--bg-hover)',
      color: isOn ? 'var(--es-success)' : 'var(--text-tertiary)',
    }}>
      {isOn ? 'ON' : 'OFF'}
    </div>
  </div>
);

// Activity Timeline Item
const TimelineItem: React.FC<{
  event: { type: string; description: string; timestamp: string };
  index: number;
}> = ({ event, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    style={{
      display: 'flex', gap: '0.75rem', padding: '0.625rem 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}
  >
    <div style={{
      width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
      background: event.type === 'alert' ? 'var(--es-error)' :
                  event.type === 'device' ? 'var(--es-orange)' :
                  event.type === 'motion' ? 'var(--es-info)' : 'var(--es-grey)',
    }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '0.8125rem' }}>{event.description}</div>
      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
        {new Date(event.timestamp).toLocaleTimeString()}
      </div>
    </div>
  </motion.div>
);


const Dashboard: React.FC = () => {
  const { sensors } = useSensorStore();
  const { status, demoMode } = useSystemStore();
  const { devices } = useDeviceStore();
  const { alerts } = useAlertStore();
  const { healthData } = useDeviceHealthStore();
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightControlBusy, setLightControlBusy] = useState(false);
  const [fanControlBusy, setFanControlBusy] = useState(false);
  const [lightControlError, setLightControlError] = useState('');
  const [fanControlError, setFanControlError] = useState('');
  const setDevices = useDeviceStore(state => state.setDevices);

  useEffect(() => {
    const load = async () => {
      try {
        const [readings, history, deviceResponse] = await Promise.all([
          api.sensorHistory('temperature', '1h').catch(() => ({ data: [] })),
          api.getActivityHistory({ per_page: 10 }).catch(() => ({ data: [] })),
          api.getDevices().catch(() => ({ data: [] })),
        ]);
        setChartData(readings.data || []);
        setRecentEvents(history.data || []);
        setDevices(deviceResponse.data || []);
      } catch {
        // Backend may be offline
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [setDevices]);

  const temp = sensors.temperature;
  const humidity = sensors.humidity;
  const brightness = sensors.brightness;
  const motionSensor = sensors.motion;
  const presence = sensors.presence;
  const lightDevice = devices.find(d => d.type === 'light');
  const fanDevice = devices.find(d => d.type === 'fan');
  const activeAlerts = alerts.filter(a => a.state === 'active');
  const source = demoMode ? 'simulated' : status.esp32 as any;

  const toggleDevice = async (device: any, type: 'light' | 'fan') => {
    if (!device || (type === 'light' ? lightControlBusy : fanControlBusy)) return;

    const setBusy = type === 'light' ? setLightControlBusy : setFanControlBusy;
    const setError = type === 'light' ? setLightControlError : setFanControlError;

    setBusy(true);
    setError('');

    try {
      const nextState = device.state === 'on' ? 'off' : 'on';
      await api.controlDevice(device.id, nextState);
    } catch (error) {
      setError(error instanceof Error ? error.message : `Could not control the ${type}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleLight = async () => {
    await toggleDevice(lightDevice, 'light');
  };

  const toggleFan = async () => {
    await toggleDevice(fanDevice, 'fan');
  };

  return (
    <PageTransition>
      <div className="es-page" style={{ position: 'relative' }}>
        <AmbientGlow intensity={0.08} />

        {/* Header */}
        <div className="es-page-header" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="es-page-title">Dashboard</h1>
              <p className="es-page-subtitle">
                Real-time room monitoring overview
                {status.lastUpdate && (
                  <span style={{ marginLeft: 8, fontSize: '0.8125rem' }}>
                    · Updated {new Date(status.lastUpdate).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {activeAlerts.length > 0 && (
                <div className="es-badge es-badge-error" style={{ gap: 4 }}>
                  <AlertTriangle size={12} />
                  {activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sensor Metrics Grid */}
        <StaggerContainer className="es-grid-dashboard" style={{ position: 'relative', zIndex: 1 }}>
          <StaggerItem>
            <MetricCard
              id="metric-temperature"
              icon={<Thermometer size={18} />}
              label="Temperature"
              value={temp?.value ?? null}
              unit="°C"
              trend={temp && temp.value > 30 ? 'up' : 'stable'}
              status={source}
              subtitle={temp ? `Source: ${temp.source}` : 'Waiting for data...'}
              color="var(--es-error)"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              id="metric-humidity"
              icon={<Droplets size={18} />}
              label="Humidity"
              value={humidity?.value ?? null}
              unit="%"
              status={source}
              subtitle={humidity ? `Source: ${humidity.source}` : 'Waiting for data...'}
              color="var(--es-info)"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              id="metric-brightness"
              icon={<Sun size={18} />}
              label="Brightness"
              value={brightness?.unit === 'state'
                ? brightness.value > 0 ? 'Bright' : 'Dark'
                : brightness?.value ?? null}
              unit={brightness?.unit === 'state' ? '' : brightness?.unit || 'lux'}
              status={source}
              subtitle={brightness ? `Source: ${brightness.source}` : 'Waiting for data...'}
              color="var(--es-yellow)"
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              id="metric-motion"
              icon={<Move size={18} />}
              label="Motion"
              value={motionSensor?.is_valid ? (motionSensor.value > 0 ? 'Detected' : 'Clear') : null}
              status={source}
              subtitle={motionSensor?.is_valid ? 'From presence sensor' : 'Presence sensor not reporting'}
              color={motionSensor?.value ? 'var(--es-warning)' : 'var(--es-grey)'}
            />
          </StaggerItem>
          <StaggerItem>
            <MetricCard
              id="metric-presence"
              icon={<Eye size={18} />}
              label="Presence"
              value={presence?.is_valid ? (presence.value > 0 ? 'Occupied' : 'Empty') : null}
              status={source}
              subtitle={presence?.is_valid ? 'Presence sensor' : 'Sensor not reporting'}
              color={presence?.value ? 'var(--es-success)' : 'var(--es-grey)'}
            />
          </StaggerItem>
        </StaggerContainer>

        {/* Device Status + Active Alerts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', position: 'relative', zIndex: 1 }}>
          {/* Devices */}
          <div className="es-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} style={{ color: 'var(--es-orange)' }} />
              Device Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <DeviceCard
                id="device-light"
                icon={<Lightbulb size={20} />}
                name="Room Light"
                isOn={lightDevice?.state === 'on'}
                source={lightDevice?.source || 'unknown'}
                lastChange={lightDevice?.lastStateChange || undefined}
              />
              <button
                id="light-control"
                className="es-btn es-btn-primary"
                type="button"
                onClick={toggleLight}
                disabled={!lightDevice || lightControlBusy || status.backend !== 'online'}
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              >
                <Lightbulb size={16} />
                {lightControlBusy ? 'Sending...' : lightDevice?.state === 'on' ? 'Turn light off' : 'Turn light on'}
              </button>
              {lightControlError && (
                <div role="alert" style={{ color: 'var(--es-error)', fontSize: '0.8125rem' }}>
                  {lightControlError}
                </div>
              )}
              <DeviceCard
                id="device-fan"
                icon={<Fan size={20} />}
                name="Room Fan"
                isOn={fanDevice?.state === 'on'}
                source={fanDevice?.source || 'unknown'}
                lastChange={fanDevice?.lastStateChange || undefined}
              />
              <button
                id="fan-control"
                className="es-btn es-btn-primary"
                type="button"
                onClick={toggleFan}
                disabled={!fanDevice || fanControlBusy || status.backend !== 'online'}
                style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
              >
                <Fan size={16} />
                {fanControlBusy ? 'Sending...' : fanDevice?.state === 'on' ? 'Turn fan off' : 'Turn fan on'}
              </button>
              {fanControlError && (
                <div role="alert" style={{ color: 'var(--es-error)', fontSize: '0.8125rem' }}>
                  {fanControlError}
                </div>
              )}
            </div>
          </div>

          {/* Active Alerts */}
          <div className="es-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--es-warning)' }} />
              Active Alerts
              {activeAlerts.length > 0 && (
                <span className="es-badge es-badge-error" style={{ marginLeft: 'auto' }}>
                  {activeAlerts.length}
                </span>
              )}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
              {activeAlerts.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                  No active alerts
                </div>
              ) : (
                activeAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      padding: '0.625rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: alert.severity === 'critical' ? 'var(--es-error-glow)' : 'var(--bg-hover)',
                      borderLeft: `3px solid ${alert.severity === 'critical' ? 'var(--es-error)' : 'var(--es-warning)'}`,
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{alert.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Environmental Trend Chart + Timeline */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginTop: '1rem', position: 'relative', zIndex: 1 }}>
          {/* Live Chart */}
          <ChartReveal>
            <div className="es-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} style={{ color: 'var(--es-orange)' }} />
                Environmental Trends
              </h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--es-orange)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--es-orange)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis
                      dataKey="timestamp"
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                      tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      stroke="var(--border-primary)"
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                      stroke="var(--border-primary)"
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8125rem',
                      }}
                      labelFormatter={(v: any) => (v ? new Date(v).toLocaleString() : '')}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="var(--es-orange)"
                      strokeWidth={2}
                      fill="url(#tempGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: 'var(--es-orange)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{
                  height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-tertiary)', fontSize: '0.875rem',
                }}>
                  {loading ? <Skeleton height={220} /> : 'No chart data available. Start the backend to collect readings.'}
                </div>
              )}
            </div>
          </ChartReveal>

          {/* Recent Activity Timeline */}
          <div className="es-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} style={{ color: 'var(--es-orange)' }} />
              Recent Activity
            </h3>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {recentEvents.length > 0 ? (
                recentEvents.map((event: any, i: number) => (
                  <TimelineItem key={event.id || i} event={event} index={i} />
                ))
              ) : (
                <div style={{
                  padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem',
                }}>
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Device Health Overview */}
        {healthData.length > 0 && (
          <div className="es-card" style={{ padding: '1.25rem', marginTop: '1rem', position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HeartPulse size={18} style={{ color: 'var(--es-orange)' }} />
              Device Health
            </h3>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {healthData.map((h) => (
                <HealthRing
                  key={h.device_id}
                  value={h.health_score}
                  label={h.device_name}
                  size={90}
                />
              ))}
            </div>
          </div>
        )}

        {/* Connection Status Footer */}
        <div style={{
          marginTop: '1.5rem', padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.75rem', color: 'var(--text-tertiary)',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Backend: <span style={{ color: status.backend === 'online' ? 'var(--es-success)' : 'var(--es-error)' }}>{status.backend}</span></span>
            <span>ESP32: <span style={{ color: status.esp32 === 'online' ? 'var(--es-success)' : 'var(--es-error)' }}>{status.esp32}</span></span>
            <span>Bluetooth: <span style={{ color: status.bluetooth === 'online' ? 'var(--es-info)' : 'var(--es-error)' }}>{status.bluetooth}</span></span>
            <span>Internet: <span style={{ color: status.internet === 'online' ? 'var(--es-success)' : 'var(--es-error)' }}>{status.internet}</span></span>
          </div>
          <span>
            {demoMode ? 'Demo Mode — Simulated Data' : 'Hardware Mode'}
          </span>
        </div>
      </div>
    </PageTransition>
  );
};

export default Dashboard;
