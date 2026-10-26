// ============================================================
// EdgeSense — Energy Intelligence Page (Feature #4)
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  Zap, Battery, TrendingUp, TrendingDown, DollarSign, Clock,
  BarChart3, Lightbulb, Fan, AlertCircle, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { useSensorStore, useSettingsStore, useSystemStore } from '@/store';
import {
  PageTransition, StaggerContainer, StaggerItem, AnimatedNumber,
  ChartReveal, Skeleton,
} from '@/components/animations';
import api from '@/utils/api';

const EnergyPage: React.FC = () => {
  const { sensors } = useSensorStore();
  const { settings } = useSettingsStore();
  const { demoMode } = useSystemStore();
  const [energyData, setEnergyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('24h');

  useEffect(() => {
    setLoading(true);
    api.getEnergy(period)
      .then(res => setEnergyData(res.data || res))
      .catch(() => setEnergyData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const voltage = sensors.voltage;
  const current = sensors.current;
  const power = sensors.power;
  const energy = sensors.energy;
  const validVoltage = voltage?.is_valid && voltage.value !== null ? voltage : null;
  const validCurrent = current?.is_valid && current.value !== null ? current : null;
  const validPower = power?.is_valid && power.value !== null ? power : null;
  const validEnergy = energy?.is_valid && energy.value !== null ? energy : null;

  const COLORS = ['var(--es-orange)', 'var(--es-yellow)', 'var(--es-success)', 'var(--es-info)'];

  return (
    <PageTransition>
      <div className="es-page">
        <div className="es-page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="es-page-title">Energy Intelligence</h1>
              <p className="es-page-subtitle">Power monitoring, consumption tracking, and cost estimation</p>
            </div>
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', padding: 2 }}>
              {['24h', '7d', '30d'].map(p => (
                <button key={p} onClick={() => setPeriod(p)} style={{
                  padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: period === p ? 'var(--es-orange)' : 'transparent',
                  color: period === p ? 'white' : 'var(--text-secondary)',
                  fontWeight: 500, fontSize: '0.8125rem', cursor: 'pointer',
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Measurement Notice */}
        {!validVoltage && !validPower && (
          <div style={{
            padding: '0.875rem 1rem', borderRadius: 'var(--radius-md)',
            background: 'var(--es-info-glow)', border: '1px solid rgba(96,165,250,0.2)',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1rem',
            fontSize: '0.8125rem', color: 'var(--es-info)',
          }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              {demoMode
                ? <><strong>Demo mode is active.</strong> Energy charts show simulated estimates. Connect an INA219 module (low-voltage DC only) for real measurements.</>
                : <><strong>No valid INA219 readings.</strong> Check the module wiring and measured circuit; unavailable values will remain blank instead of showing simulated power.</>}
            </div>
          </div>
        )}

        {/* Live Power Metrics */}
        <StaggerContainer className="es-grid-dashboard" style={{ marginBottom: '1rem' }}>
          <StaggerItem>
            <div className="es-card" id="energy-voltage">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--es-warning-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--es-warning)' }}>
                  <Zap size={16} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Voltage</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {validVoltage ? <AnimatedNumber value={validVoltage.value} suffix=" V" decimals={2} /> : <span style={{ color: 'var(--text-tertiary)' }}>— V</span>}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {validVoltage ? `${validVoltage.source} measurement` : 'No valid reading'}
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="es-card" id="energy-current">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--es-info-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--es-info)' }}>
                  <Battery size={16} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Current</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {validCurrent ? <AnimatedNumber value={validCurrent.value * 1000} suffix=" mA" decimals={1} /> : <span style={{ color: 'var(--text-tertiary)' }}>— mA</span>}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {validCurrent ? `${validCurrent.source} measurement` : 'No valid reading'}
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="es-card" id="energy-power">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--es-orange-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--es-orange)' }}>
                  <TrendingUp size={16} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Power</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {validPower ? <AnimatedNumber value={validPower.value} suffix=" W" decimals={2} /> : <span style={{ color: 'var(--text-tertiary)' }}>— W</span>}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {validPower ? `${validPower.source} measurement` : 'No valid reading'}
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="es-card" id="energy-total">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--es-success-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--es-success)' }}>
                  <DollarSign size={16} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Est. Cost</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {validEnergy && energyData?.estimated_cost != null ? (
                  <AnimatedNumber value={energyData.estimated_cost} prefix={`${settings.currency} `} decimals={2} />
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                )}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {settings.currency} {settings.electricity_tariff}/kWh tariff
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Power Over Time */}
          <ChartReveal>
            <div className="es-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Power Consumption Over Time</h3>
              {energyData?.power_history?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={energyData.power_history}>
                    <defs>
                      <linearGradient id="powerG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--es-orange)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--es-orange)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="timestamp" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                      tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} unit=" W" />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }} />
                    <Area type="monotone" dataKey="power" stroke="var(--es-orange)" strokeWidth={2} fill="url(#powerG)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  No power data for this period
                </div>
              )}
            </div>
          </ChartReveal>

          {/* Device Usage Pie */}
          <div className="es-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Device Runtime Share</h3>
            {energyData?.device_runtimes ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={Object.entries(energyData.device_runtimes).map(([name, hours]: [string, any]) => ({ name, value: hours }))}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {Object.keys(energyData.device_runtimes).map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}
                    formatter={(val: any) => [`${typeof val === 'number' ? val.toFixed(1) : val} hrs`, '']} />
                  <Legend formatter={(value: string) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                No device runtime data
              </div>
            )}
          </div>
        </div>

        {/* Daily Comparison */}
        <ChartReveal>
          <div className="es-card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Daily Energy Comparison</h3>
            {energyData?.daily_comparison?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={energyData.daily_comparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} unit=" Wh" />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }} />
                  <Bar dataKey="energy_wh" fill="var(--es-orange)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                No daily comparison data
              </div>
            )}
          </div>
        </ChartReveal>

        {/* Energy Saving Tips */}
        <div className="es-card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>
            <Lightbulb size={18} style={{ color: 'var(--es-yellow)', marginRight: 6, verticalAlign: 'middle' }} />
            Recommendations
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {(energyData?.recommendations || [
              { text: 'Turn off lights when leaving the room', potential_saving: '15%' },
              { text: 'Use fan on lower speed during mild weather', potential_saving: '10%' },
              { text: 'Monitor standby power consumption', potential_saving: '5%' },
            ]).map((rec: any, i: number) => (
              <div key={i} style={{
                padding: '0.75rem', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-hover)', borderLeft: '3px solid var(--es-yellow)',
                fontSize: '0.8125rem',
              }}>
                <div>{rec.text}</div>
                {rec.potential_saving && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--es-success)', marginTop: 4 }}>
                    Potential saving: ~{rec.potential_saving}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            {demoMode ? 'Recommendations based on simulated usage patterns.' : 'Recommendations based on actual recorded usage.'}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default EnergyPage;
