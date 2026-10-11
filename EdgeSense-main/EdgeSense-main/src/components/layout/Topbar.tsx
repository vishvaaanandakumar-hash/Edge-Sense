// ============================================================
// EdgeSense — Top Navigation Bar
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Monitor,
  Wifi,
  WifiOff,
  Bluetooth,
  BluetoothOff,
  Radio,
  AlertTriangle,
  X,
  Command,
} from 'lucide-react';
import { useSystemStore, useThemeStore, useAlertStore, useNotificationStore } from '@/store';
import { DataPulse } from '@/components/animations';

const Topbar: React.FC = () => {
  const { status, demoMode } = useSystemStore();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const { alerts, unreadCount } = useAlertStore();
  const { notifications } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const themeIcons = {
    dark: <Moon size={16} />,
    light: <Sun size={16} />,
    system: <Monitor size={16} />,
  };

  const cycleTheme = () => {
    const order: Array<'dark' | 'light' | 'system'> = ['dark', 'light', 'system'];
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % 3]);
  };

  const getStatusLabel = () => {
    if (demoMode) return { text: 'DEMO MODE', color: 'var(--es-warning)' };
    if (status.esp32 === 'online') return { text: 'LIVE', color: 'var(--es-success)' };
    if (status.backend === 'online') return { text: 'BACKEND ONLY', color: 'var(--es-info)' };
    return { text: 'OFFLINE', color: 'var(--es-error)' };
  };

  const statusLabel = getStatusLabel();

  return (
    <>
      <header
        style={{
          height: 'var(--topbar-height)',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          flexShrink: 0,
        }}
      >
        {/* Left: Status Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* System Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: `${statusLabel.color}15`,
              border: `1px solid ${statusLabel.color}30`,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: statusLabel.color,
              letterSpacing: '0.04em',
            }}
          >
            <DataPulse
              active={status.backend === 'online'}
              color={statusLabel.color}
              size={7}
            />
            {statusLabel.text}
          </div>

          {/* Connection Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              className="es-tooltip"
              data-tooltip={`ESP32: ${status.esp32}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: status.esp32 === 'online' ? 'var(--es-success)' : 'var(--text-tertiary)' }}
            >
              <Radio size={14} />
            </div>
            <div
              className="es-tooltip"
              data-tooltip={`Bluetooth: ${status.bluetooth}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: status.bluetooth === 'online' ? 'var(--es-info)' : 'var(--text-tertiary)' }}
            >
              {status.bluetooth === 'online' ? <Bluetooth size={14} /> : <BluetoothOff size={14} />}
            </div>
            <div
              className="es-tooltip"
              data-tooltip={`Internet: ${status.internet}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: status.internet === 'online' ? 'var(--es-success)' : 'var(--text-tertiary)' }}
            >
              {status.internet === 'online' ? <Wifi size={14} /> : <WifiOff size={14} />}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Search Button */}
          <button
            id="global-search-btn"
            onClick={() => setShowSearch(!showSearch)}
            className="es-btn es-btn-ghost"
            style={{ padding: '0.5rem', position: 'relative' }}
            aria-label="Search"
          >
            <Search size={18} />
            <span style={{
              fontSize: '0.625rem',
              color: 'var(--text-tertiary)',
              marginLeft: 4,
              padding: '1px 6px',
              background: 'var(--bg-hover)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-primary)',
            }}>
              ⌘K
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={cycleTheme}
            className="es-btn es-btn-ghost"
            style={{ padding: '0.5rem' }}
            aria-label={`Switch theme (current: ${theme})`}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {themeIcons[theme]}
            </motion.div>
          </button>

          {/* Notifications */}
          <button
            id="notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="es-btn es-btn-ghost"
            style={{ padding: '0.5rem', position: 'relative' }}
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: 'var(--es-error)',
                  color: 'white',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>
        </div>
      </header>

      {/* Demo Mode Banner */}
      {demoMode && (
        <div className="es-demo-banner">
          <AlertTriangle size={14} />
          <span>SIMULATED DATA — Demo mode is active. Sensor values are generated, not measured.</span>
        </div>
      )}

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 45,
              }}
              onClick={() => setShowNotifications(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                top: 'calc(var(--topbar-height) + 8px)',
                right: 16,
                width: 380,
                maxHeight: 480,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '0.875rem 1rem',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Notifications</span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="es-btn es-btn-ghost"
                  style={{ padding: 4 }}
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ overflowY: 'auto', maxHeight: 400, padding: '0.5rem' }}>
                {alerts.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: '0.875rem',
                  }}>
                    No notifications
                  </div>
                ) : (
                  alerts.slice(0, 20).map((alert) => (
                    <div
                      key={alert.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 4,
                        background: alert.state === 'active' ? 'var(--accent-glow)' : 'transparent',
                        borderLeft: `3px solid ${
                          alert.severity === 'critical' ? 'var(--es-error)' :
                          alert.severity === 'warning' ? 'var(--es-warning)' :
                          'var(--es-info)'
                        }`,
                      }}
                    >
                      <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{alert.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{alert.message}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                        {new Date(alert.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Topbar;
