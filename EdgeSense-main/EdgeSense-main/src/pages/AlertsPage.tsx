// ============================================================
// EdgeSense — Alerts & Notifications Page (Feature #5)
// ============================================================

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, AlertTriangle, AlertCircle, Info, CheckCircle2,
  Plus, Trash2, Edit2, Shield, X, ChevronDown,
  Thermometer, Droplets, Eye, Clock, Zap,
} from 'lucide-react';
import { useAlertStore, useSystemStore } from '@/store';
import { PageTransition, StaggerContainer, StaggerItem, TimelineReveal } from '@/components/animations';
import api from '@/utils/api';
import type { Alert, AlertRule, AlertSeverity } from '@/types';

const SEVERITY_CONFIG = {
  info: { color: 'var(--es-info)', bg: 'var(--es-info-glow)', icon: <Info size={16} />, label: 'Info' },
  warning: { color: 'var(--es-warning)', bg: 'var(--es-warning-glow)', icon: <AlertTriangle size={16} />, label: 'Warning' },
  critical: { color: 'var(--es-error)', bg: 'var(--es-error-glow)', icon: <AlertCircle size={16} />, label: 'Critical' },
};

const STATE_CONFIG = {
  active: { color: 'var(--es-error)', label: 'Active' },
  acknowledged: { color: 'var(--es-warning)', label: 'Acknowledged' },
  resolved: { color: 'var(--es-success)', label: 'Resolved' },
};

const AlertCard: React.FC<{
  alert: Alert;
  onAcknowledge: (id: number) => void;
  onResolve: (id: number) => void;
}> = ({ alert, onAcknowledge, onResolve }) => {
  const severity = SEVERITY_CONFIG[alert.severity];
  const state = STATE_CONFIG[alert.state];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="es-card"
      style={{
        borderLeft: `3px solid ${severity.color}`,
        padding: '1rem',
        background: alert.state === 'active' ? severity.bg : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
          <div style={{ color: severity.color, flexShrink: 0, marginTop: 2 }}>{severity.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{alert.title}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4 }}>{alert.message}</div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              <span>{new Date(alert.created_at).toLocaleString()}</span>
              <span style={{ color: state.color }}>● {state.label}</span>
              {alert.source && <span>Source: {alert.source}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
          {alert.state === 'active' && (
            <button
              className="es-btn es-btn-secondary"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
              onClick={() => onAcknowledge(alert.id)}
            >
              Acknowledge
            </button>
          )}
          {alert.state !== 'resolved' && (
            <button
              className="es-btn es-btn-ghost"
              style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', color: 'var(--es-success)' }}
              onClick={() => onResolve(alert.id)}
            >
              Resolve
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const RuleEditor: React.FC<{
  rule?: AlertRule;
  onSave: (rule: any) => void;
  onCancel: () => void;
}> = ({ rule, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    condition_sensor: rule?.condition_sensor || 'temperature',
    condition_operator: rule?.condition_operator || '>',
    condition_value: rule?.condition_value || 30,
    condition_value2: rule?.condition_value2 || 0,
    severity: rule?.severity || 'warning' as AlertSeverity,
    cooldown_seconds: rule?.cooldown_seconds || 300,
    enabled: rule?.enabled ?? true,
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="es-card"
      style={{ padding: '1.25rem', borderColor: 'var(--es-orange)', borderWidth: 1 }}
    >
      <h4 style={{ fontWeight: 600, marginBottom: '1rem' }}>{rule ? 'Edit Rule' : 'Create New Rule'}</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Rule Name</label>
          <input className="es-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="High Temperature Alert" />
        </div>
        <div>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Sensor</label>
          <select className="es-input" value={form.condition_sensor} onChange={e => setForm({ ...form, condition_sensor: e.target.value as any })}>
            <option value="temperature">Temperature</option>
            <option value="humidity">Humidity</option>
            <option value="brightness">Brightness</option>
            <option value="motion">Motion</option>
            <option value="presence">Presence</option>
            <option value="power">Power</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Condition</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="es-input" style={{ width: 80 }} value={form.condition_operator} onChange={e => setForm({ ...form, condition_operator: e.target.value as any })}>
              <option value=">">{'>'}</option>
              <option value="<">{'<'}</option>
              <option value=">=">{'>='}</option>
              <option value="<=">{'<='}</option>
              <option value="==">{'=='}</option>
              <option value="between">Between</option>
              <option value="outside">Outside</option>
            </select>
            <input className="es-input" type="number" value={form.condition_value} onChange={e => setForm({ ...form, condition_value: parseFloat(e.target.value) })} />
            {(form.condition_operator === 'between' || form.condition_operator === 'outside') && (
              <input className="es-input" type="number" value={form.condition_value2} onChange={e => setForm({ ...form, condition_value2: parseFloat(e.target.value) })} />
            )}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Severity</label>
          <select className="es-input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as AlertSeverity })}>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Cooldown (seconds)</label>
          <input className="es-input" type="number" value={form.cooldown_seconds} onChange={e => setForm({ ...form, cooldown_seconds: parseInt(e.target.value) })} />
        </div>
        <div>
          <label style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Description</label>
          <input className="es-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Alert when temperature exceeds threshold" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
        <button className="es-btn es-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="es-btn es-btn-primary" onClick={() => onSave(form)} disabled={!form.name}>
          {rule ? 'Update' : 'Create'} Rule
        </button>
      </div>
    </motion.div>
  );
};

const AlertsPage: React.FC = () => {
  const { alerts, setAlerts, acknowledgeAlert, resolveAlert } = useAlertStore();
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all');
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | undefined>();
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');

  useEffect(() => {
    api.getAlerts().then(res => setAlerts(res.data || [])).catch(() => {});
    api.getAlertRules().then(res => setRules(res.data || [])).catch(() => {});
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await api.acknowledgeAlert(id);
      acknowledgeAlert(id);
    } catch {}
  };

  const handleResolve = async (id: number) => {
    try {
      await api.resolveAlert(id);
      resolveAlert(id);
    } catch {}
  };

  const handleSaveRule = async (ruleData: any) => {
    try {
      if (editingRule) {
        await api.updateAlertRule(editingRule.id, ruleData);
      } else {
        await api.createAlertRule(ruleData);
      }
      const res = await api.getAlertRules();
      setRules(res.data || []);
      setShowRuleEditor(false);
      setEditingRule(undefined);
    } catch {}
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await api.deleteAlertRule(id);
      setRules(rules.filter(r => r.id !== id));
    } catch {}
  };

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.state === filter);

  return (
    <PageTransition>
      <div className="es-page">
        <div className="es-page-header">
          <h1 className="es-page-title">Alerts & Rules</h1>
          <p className="es-page-subtitle">Monitor conditions and manage automation rules</p>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: 2, marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', padding: 2, width: 'fit-content' }}>
          {(['alerts', 'rules'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none',
              background: tab === t ? 'var(--es-orange)' : 'transparent',
              color: tab === t ? 'white' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {t === 'alerts' ? `Alerts (${alerts.length})` : `Rules (${rules.length})`}
            </button>
          ))}
        </div>

        {tab === 'alerts' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {(['all', 'active', 'acknowledged', 'resolved'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`es-btn ${filter === f ? 'es-btn-primary' : 'es-btn-secondary'}`} style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem', textTransform: 'capitalize' }}>
                  {f}
                </button>
              ))}
            </div>

            {/* Alert List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <AnimatePresence mode="popLayout">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} onResolve={handleResolve} />
                  ))
                ) : (
                  <div className="es-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <Bell size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <div style={{ fontSize: '0.9375rem' }}>No {filter !== 'all' ? filter : ''} alerts</div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {tab === 'rules' && (
          <>
            <button
              className="es-btn es-btn-primary"
              style={{ marginBottom: '1rem' }}
              onClick={() => { setEditingRule(undefined); setShowRuleEditor(true); }}
            >
              <Plus size={16} /> Create Rule
            </button>

            <AnimatePresence>
              {showRuleEditor && (
                <div style={{ marginBottom: '1rem' }}>
                  <RuleEditor
                    rule={editingRule}
                    onSave={handleSaveRule}
                    onCancel={() => { setShowRuleEditor(false); setEditingRule(undefined); }}
                  />
                </div>
              )}
            </AnimatePresence>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {rules.map((rule) => (
                <div key={rule.id} className="es-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: SEVERITY_CONFIG[rule.severity].bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: SEVERITY_CONFIG[rule.severity].color,
                  }}>
                    <Shield size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{rule.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {rule.condition_sensor} {rule.condition_operator} {rule.condition_value}
                      {rule.condition_value2 ? ` - ${rule.condition_value2}` : ''} · Cooldown: {rule.cooldown_seconds}s
                    </div>
                  </div>
                  <span className={`es-badge ${rule.enabled ? 'es-badge-success' : ''}`} style={!rule.enabled ? { background: 'var(--bg-hover)', color: 'var(--text-tertiary)' } : {}}>
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className="es-btn es-btn-ghost" style={{ padding: '0.375rem' }}
                      onClick={() => { setEditingRule(rule); setShowRuleEditor(true); }}>
                      <Edit2 size={14} />
                    </button>
                    <button className="es-btn es-btn-ghost" style={{ padding: '0.375rem', color: 'var(--es-error)' }}
                      onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {rules.length === 0 && (
                <div className="es-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <Shield size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                  <div>No rules configured. Create one to get started.</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
};

export default AlertsPage;
