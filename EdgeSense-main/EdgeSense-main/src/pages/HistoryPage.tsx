import React, { useEffect, useState } from 'react';
import { Calendar, Clock3, Download, Filter, History, Search } from 'lucide-react';
import type { DeviceRuntimeHistory } from '@/types';
import api from '@/utils/api';

type HistoryItem = {
  id: number;
  type?: string;
  event_type?: string;
  source?: string;
  description: string;
  timestamp: string;
};

const localDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDuration = (milliseconds: number) => {
  if (milliseconds <= 0) return '0 minutes';
  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return '< 1 minute';
  if (hours === 0) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hourLabel = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return minutes === 0
    ? hourLabel
    : `${hourLabel} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
};

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const HistoryPage: React.FC = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [selectedDate, setSelectedDate] = useState(() => localDateValue(new Date()));
  const [runtime, setRuntime] = useState<DeviceRuntimeHistory | null>(null);
  const [runtimeError, setRuntimeError] = useState('');
  const [runtimeLoading, setRuntimeLoading] = useState(true);

  const load = () => api.getActivityHistory({
    per_page: 100,
    search: query || undefined,
    type: type === 'all' ? undefined : type,
  }).then(response => setItems((response.data || []) as HistoryItem[])).catch(() => setItems([]));

  useEffect(() => {
    load();
  }, [query, type]);

  useEffect(() => {
    let cancelled = false;
    const loadRuntime = (initialLoad = false) => {
      if (initialLoad) {
        setRuntimeLoading(true);
        setRuntimeError('');
      }
      api.getDeviceRuntime(selectedDate)
        .then(response => {
          if (!cancelled) {
            setRuntime(response.data);
            setRuntimeError('');
          }
        })
        .catch(error => {
          if (!cancelled) {
            setRuntime(null);
            setRuntimeError(error instanceof Error ? error.message : 'Could not load device runtime.');
          }
        })
        .finally(() => {
          if (!cancelled && initialLoad) setRuntimeLoading(false);
        });
    };
    loadRuntime(true);
    const interval = window.setInterval(() => loadRuntime(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [selectedDate]);

  const exportHistory = async () => {
    const blob = await api.exportHistory({ type: type === 'all' ? undefined : type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'edgesense-history.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const dates = [...new Set(runtime?.daily_totals.map(item => item.date) || [])].reverse();

  return (
    <div className="es-page">
      <div className="es-page-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="es-badge es-badge-orange"><History size={14} /> Local event journal</div>
          <h1 className="es-page-title">Activity History</h1>
          <p className="es-page-subtitle">Review device runtime, daily usage, and recorded device, alert, motion, and voice events.</p>
        </div>
        <button id="history-export" className="es-btn es-btn-secondary" onClick={exportHistory}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <section className="es-card" style={{ marginBottom: '1rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Device runtime</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '.8125rem', margin: '.35rem 0 0' }}>
              Daily running time for the selected date and the six preceding days.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-secondary)', fontSize: '.875rem' }}>
            <Calendar size={16} />
            Selected day
            <input
              id="runtime-date"
              className="es-input"
              type="date"
              value={selectedDate}
              max={localDateValue(new Date())}
              onChange={event => setSelectedDate(event.target.value)}
              style={{ width: 'auto' }}
            />
          </label>
        </div>

        {runtimeError && (
          <div role="alert" style={{ color: 'var(--es-error)', marginBottom: '1rem' }}>
            {runtimeError}
          </div>
        )}

        {runtimeLoading ? (
          <p style={{ color: 'var(--text-tertiary)' }}>Loading runtime…</p>
        ) : runtime && dates.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.75rem' }}>
            {dates.map(date => {
              const dayTotals = runtime.daily_totals.filter(item => item.date === date);
              return (
                <div key={date} style={{ padding: '.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <strong style={{ display: 'block', marginBottom: '.65rem' }}>{formatDate(date)}</strong>
                  {dayTotals.map(total => (
                    <div key={total.device_id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', color: 'var(--text-secondary)', fontSize: '.8125rem', padding: '.2rem 0' }}>
                      <span>{total.device_name}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatDuration(total.duration_ms)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : !runtimeError ? (
          <p style={{ color: 'var(--text-tertiary)' }}>No device runtime data available.</p>
        ) : null}

        <div style={{ marginTop: '1.25rem' }}>
          <h3 style={{ fontSize: '.95rem', fontWeight: 600, margin: '0 0 .75rem' }}>
            ON/OFF sessions for {formatDate(selectedDate)}
          </h3>
          {runtimeLoading ? (
            <p style={{ color: 'var(--text-tertiary)' }}>Loading sessions…</p>
          ) : runtime?.sessions.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8125rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '.6rem .5rem' }}>Device</th>
                    <th style={{ padding: '.6rem .5rem' }}>Turned on</th>
                    <th style={{ padding: '.6rem .5rem' }}>Turned off</th>
                    <th style={{ padding: '.6rem .5rem' }}>Runtime that day</th>
                  </tr>
                </thead>
                <tbody>
                  {runtime.sessions.map(session => (
                    <tr key={session.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '.7rem .5rem', fontWeight: 500 }}>{session.device_name}</td>
                      <td style={{ padding: '.7rem .5rem' }}>{new Date(session.started_at).toLocaleString()}</td>
                      <td style={{ padding: '.7rem .5rem', color: session.ended_at ? 'var(--text-primary)' : 'var(--es-success)' }}>
                        {session.ended_at ? new Date(session.ended_at).toLocaleString() : 'Still on'}
                      </td>
                      <td style={{ padding: '.7rem .5rem', fontWeight: 600 }}>{formatDuration(session.duration_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--text-tertiary)' }}>No ON sessions recorded for this day.</p>
          )}
        </div>
      </section>

      <div className="es-card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-tertiary)' }} />
          <input id="history-search" className="es-input" style={{ paddingLeft: 36 }} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search events" />
        </div>
        <select id="history-type" className="es-input" style={{ width: 180 }} value={type} onChange={event => setType(event.target.value)}>
          <option value="all">All event types</option>
          <option value="device">Device</option>
          <option value="alert">Alert</option>
          <option value="voice">Voice</option>
        </select>
        <button id="history-refresh" className="es-btn es-btn-ghost" onClick={load}>
          <Filter size={16} /> Refresh
        </button>
      </div>

      <div className="es-card">
        {items.length === 0 ? <p style={{ color: 'var(--text-tertiary)' }}>No matching events.</p> : items.map(item => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', padding: '.8rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--es-orange)' }}><Clock3 size={16} /></div>
            <div>
              <strong>{item.description}</strong>
              <div style={{ color: 'var(--text-tertiary)', fontSize: '.78rem' }}>{item.type || item.event_type || 'event'} {item.source ? `· ${item.source}` : ''}</div>
            </div>
            <time style={{ color: 'var(--text-tertiary)', fontSize: '.78rem' }}>{new Date(item.timestamp).toLocaleString()}</time>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPage;
