// ============================================================
// EdgeSense — Live Environmental Monitoring (Feature #3)
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  Thermometer, Droplets, Sun, Move, Eye, RefreshCw,
  Clock, AlertCircle, CheckCircle2,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { useSensorStore, useSystemStore, useSettingsStore } from '@/store';
import {
  StaggerContainer, StaggerItem, AnimatedNumber, DataPulse,
  ChartReveal, PageTransition, Skeleton,
} from '@/components/animations';
import api from '@/utils/api';

const TIME_WINDOWS = [
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '24h', value: '24h' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
];

const SENSOR_CONFIGS = [
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: <Thermometer size={18} />, color: '#F06464', gradientId: 'tempG' },
  { key: 'humidity', label: 'Humidity', unit: '%', icon: <Droplets size={18} />, color: '#60A5FA', gradientId: 'humG' },
  { key: 'brightness', label: 'Brightness', unit: 'lux', icon: <Sun size={18} />, color: '#FFE8A3', gradientId: 'luxG' },
  { key: 'motion', label: 'Motion (presence sensor)', unit: '', icon: <Move size={18} />, color: '#F5B942', gradientId: 'motG' },
  { key: 'presence', label: 'Presence', unit: '', icon: <Eye size={18} />, color: '#38C98B', gradientId: 'presG' },
];

const SensorChart: React.FC<{
  sensorKey: string;
  label: string;
  unit: string;
  color: string;
  gradientId: string;
  timeWindow: string;
}> = ({ sensorKey, label, unit, color, gradientId, timeWindow }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.sensorHistory(sensorKey, timeWindow)
      .then(res => setData(res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [sensorKey, timeWindow]);

  return (
    <ChartReveal>
      <div className="es-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{label}</h4>
          {data.length > 0 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {data.length} data points
            </span>
          )}
        </div>
        {loading ? (
          <Skeleton height={180} />
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                stroke="var(--border-primary)"
              />
              <YAxis
                tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                stroke="var(--border-primary)"
                unit={unit ? ` ${unit}` : ''}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                }}
                labelFormatter={(v: any) => (v ? new Date(v).toLocaleString() : '')}
                formatter={(val: any) => [`${typeof val === 'number' ? val.toFixed(1) : val} ${unit}`, label]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-tertiary)', fontSize: '0.875rem',
          }}>
            No data available for this time window
          </div>
        )}
      </div>
    </ChartReveal>
  );
};

const LiveMonitoring: React.FC = () => {
  const { sensors } = useSensorStore();
  const [timeWindow, setTimeWindow] = useState('1h');

  return (
    <PageTransition>
      <div className="es-page">
        {/* Header */}
        <div className="es-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="es-page-title">Live Monitoring</h1>
              <p className="es-page-subtitle">Real-time environmental sensor readings and historical trends</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Time Window Selector */}
              <div style={{
                display: 'flex', gap: 2,
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                padding: 2,
              }}>
                {TIME_WINDOWS.map(tw => (
                  <button
                    key={tw.value}
                    onClick={() => setTimeWindow(tw.value)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: timeWindow === tw.value ? 'var(--es-orange)' : 'transparent',
                      color: timeWindow === tw.value ? 'white' : 'var(--text-secondary)',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {tw.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Current Readings Grid */}
        <StaggerContainer style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {SENSOR_CONFIGS.map(sc => {
            const reading = sensors[sc.key as keyof typeof sensors];
            return (
              <StaggerItem key={sc.key}>
                <div className="es-card" style={{ textAlign: 'center', padding: '1rem' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: `${sc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: sc.color, margin: '0 auto 0.5rem',
                  }}>
                    {sc.icon}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {sc.label}
                  </div>
                  {reading?.is_valid ? (
                    <>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {sc.key === 'motion' || sc.key === 'presence' ? (
                          reading.value > 0 ? (
                            <span style={{ color: 'var(--es-success)' }}>
                              {sc.key === 'motion' ? 'Detected' : 'Occupied'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-tertiary)' }}>Clear</span>
                          )
                        ) : sc.key === 'brightness' && reading.unit === 'state' ? (
                          reading.value > 0 ? 'Bright' : 'Dark'
                        ) : (
                          <AnimatedNumber value={reading.value} suffix={` ${reading.unit || sc.unit}`} decimals={1} />
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                        <DataPulse active={reading.is_valid} size={6} />
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)' }}>
                          {reading.source}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Unavailable</div>
                  )}
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Sensor Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {SENSOR_CONFIGS.filter(sc => sc.key !== 'motion' && sc.key !== 'presence').map(sc => (
            <SensorChart
              key={sc.key}
              sensorKey={sc.key}
              label={sc.label}
              unit={sc.unit}
              color={sc.color}
              gradientId={sc.gradientId}
              timeWindow={timeWindow}
            />
          ))}
          {/* Motion & Presence combined */}
          <SensorChart
            sensorKey="motion"
            label="Motion from Presence"
            unit=""
            color="#F5B942"
            gradientId="motionG"
            timeWindow={timeWindow}
          />
          <SensorChart
            sensorKey="presence"
            label="Presence Detection"
            unit=""
            color="#38C98B"
            gradientId="presenceG"
            timeWindow={timeWindow}
          />
        </div>

        {/* Sensor Health Table */}
        <div className="es-card" style={{ marginTop: '1rem', padding: '1.25rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Sensor Status</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Sensor</th>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Value</th>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Source</th>
                  <th style={{ textAlign: 'left', padding: '0.625rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {SENSOR_CONFIGS.map(sc => {
                  const reading = sensors[sc.key as keyof typeof sensors];
                  return (
                    <tr key={sc.key} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.625rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: sc.color }}>{sc.icon}</span>
                        {sc.label}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        {reading ? (
                          <span className="es-badge es-badge-success" style={{ gap: 4 }}>
                            <CheckCircle2 size={10} /> Active
                          </span>
                        ) : (
                          <span className="es-badge" style={{ background: 'var(--bg-hover)', color: 'var(--text-tertiary)' }}>
                            No Data
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', fontFamily: 'var(--font-mono)' }}>
                        {reading ? `${reading.value} ${sc.unit}` : '—'}
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem' }}>
                        <span className={`es-badge ${reading?.source === 'simulated' ? 'es-badge-warning' : 'es-badge-info'}`}>
                          {reading?.source || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-tertiary)' }}>
                        {reading?.timestamp ? new Date(reading.timestamp).toLocaleTimeString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default LiveMonitoring;
