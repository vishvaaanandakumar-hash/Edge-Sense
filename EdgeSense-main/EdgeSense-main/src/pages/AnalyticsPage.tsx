import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, Brain, Download, Gauge, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '@/utils/api';
import { useSystemStore } from '@/store';

type Point = { timestamp: string; value: number };

const AnalyticsPage: React.FC = () => {
  const [period, setPeriod] = useState('24h');
  const [metric, setMetric] = useState('temperature');
  const [points, setPoints] = useState<Point[]>([]);
  const [summary, setSummary] = useState<{ min: number; max: number; avg: number; stddev: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { demoMode } = useSystemStore();

  useEffect(() => {
    setLoading(true);
    api.sensorHistory(metric, period).then((response) => {
      const nextPoints = (response.data || []) as Point[];
      setPoints(nextPoints);
      if (nextPoints.length) {
        const values = nextPoints.map((point) => point.value);
        const avg = values.reduce((total, value) => total + value, 0) / values.length;
        const variance = values.reduce((total, value) => total + ((value - avg) ** 2), 0) / values.length;
        setSummary({ min: Math.min(...values), max: Math.max(...values), avg, stddev: Math.sqrt(variance) });
      } else setSummary(null);
    }).catch(() => { setPoints([]); setSummary(null); }).finally(() => setLoading(false));
  }, [metric, period]);

  const exportCsv = async () => {
    const blob = await api.exportHistory({ type: metric });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edgesense-${metric}-history.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="es-page">
    <div className="es-page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <div><div className="es-badge es-badge-orange"><Brain size={14} /> Transparent local analytics</div><h1 className="es-page-title">Analytics & Trends</h1><p className="es-page-subtitle">Measured and simulated patterns from the selected sensor window.</p></div>
      <div style={{ display: 'flex', gap: 8 }}><select id="analytics-metric" className="es-input" value={metric} onChange={(event) => setMetric(event.target.value)}><option value="temperature">Temperature</option><option value="humidity">Humidity</option><option value="brightness">Brightness</option><option value="motion">Motion</option><option value="presence">Presence</option></select><select id="analytics-period" className="es-input" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="15m">15 minutes</option><option value="1h">1 hour</option><option value="24h">24 hours</option><option value="7d">7 days</option></select><button id="analytics-export" className="es-btn es-btn-secondary" onClick={exportCsv}><Download size={16} /> Export</button></div>
    </div>
    <div className="es-grid-dashboard" style={{ marginBottom: '1rem' }}>
      {([
        ['Minimum', summary?.min, TrendingDown],
        ['Average', summary?.avg, Gauge],
        ['Maximum', summary?.max, TrendingUp],
        ['Variability', summary?.stddev, Activity],
      ] as Array<[string, number | undefined, React.ComponentType<{ size?: number }>]>).map(([label, value, Icon]) => <div className="es-card" key={label}><div style={{ color: 'var(--es-orange)', marginBottom: 8 }}><Icon size={18} /></div><div style={{ color: 'var(--text-secondary)', fontSize: '.8rem' }}>{label}</div><strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-mono)' }}>{value == null ? '--' : Number(value).toFixed(1)}</strong></div>)}
    </div>
    <div className="es-card" id="analytics-chart" style={{ marginBottom: '1rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}><h3><BarChart3 size={18} color="var(--es-orange)" /> {metric} trend</h3><span className="es-badge es-badge-warning">{demoMode ? 'SIMULATED DATA' : `${points.length} measurements`}</span></div>{loading ? <div className="es-skeleton" style={{ height: 300 }} /> : points.length ? <ResponsiveContainer width="100%" height={300}><AreaChart data={points}><defs><linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--es-orange)" stopOpacity={0.35} /><stop offset="95%" stopColor="var(--es-orange)" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" /><XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} /><YAxis /><Tooltip /><Area type="monotone" dataKey="value" stroke="var(--es-orange)" fill="url(#analyticsFill)" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <p style={{ color: 'var(--text-tertiary)' }}>Not enough valid data for this period.</p>}</div>
    <div className="es-card"><h3>Plain-language insight</h3><p style={{ color: 'var(--text-secondary)' }}>{summary ? `Across ${points.length} points, ${metric} ranged from ${summary.min.toFixed(1)} to ${summary.max.toFixed(1)} with an average of ${summary.avg.toFixed(1)}. This is a descriptive statistic, not a causal explanation.` : 'Insights appear when valid measurements are available.'}</p><small style={{ color: 'var(--text-tertiary)' }}>Method: min, max, arithmetic mean, and population standard deviation over the selected window.</small></div>
  </div>;
};
export default AnalyticsPage;
