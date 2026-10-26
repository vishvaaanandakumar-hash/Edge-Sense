// ============================================================
// EdgeSense — Global State Store (Zustand)
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  SystemStatus,
  SensorState,
  Device,
  Alert,
  AppSettings,
  AppNotification,
  ThemeMode,
  ConnectionStatus,
  DeviceHealth,
} from '@/types';

// ── Settings Store ──
interface SettingsState {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'dark',
  animation_intensity: 'full',
  reduced_motion: false,
  sampling_interval_seconds: 5,
  chart_default_window: '1h',
  stale_threshold_seconds: 30,
  temperature_unit: 'celsius',
  serial_port: 'COM3',
  baud_rate: 115200,
  connection_timeout_seconds: 10,
  retry_max_attempts: 5,
  retry_backoff_seconds: 2,
  alert_cooldown_seconds: 300,
  electricity_tariff: 6.5,
  currency: '₹',
  light_expected_hours: 25000,
  fan_expected_hours: 40000,
  sensor_expected_hours: 80000,
  prediction_min_data_hours: 24,
  data_retention_days: 90,
  auto_backup: false,
  backup_interval_hours: 24,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: { ...defaultSettings },
      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),
      resetSettings: () => set({ settings: { ...defaultSettings } }),
    }),
    { name: 'edgesense-settings' }
  )
);

// ── Theme Store ──
interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme: (theme) => {
        const resolved =
          theme === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : theme;
        set({ theme, resolvedTheme: resolved });
      },
    }),
    { name: 'edgesense-theme' }
  )
);

// ── System Status Store ──
interface SystemState {
  status: SystemStatus;
  demoMode: boolean;
  sidebarCollapsed: boolean;
  setStatus: (status: Partial<SystemStatus>) => void;
  setDemoMode: (enabled: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  status: {
    backend: 'connecting',
    esp32: 'offline',
    bluetooth: 'offline',
    internet: 'online',
    demoMode: true,
    lastUpdate: null,
  },
  demoMode: true,
  sidebarCollapsed: false,
  setStatus: (partial) =>
    set((state) => ({
      status: { ...state.status, ...partial },
      ...(partial.demoMode !== undefined ? { demoMode: partial.demoMode } : {}),
    })),
  setDemoMode: (enabled) =>
    set((state) => ({
      demoMode: enabled,
      status: { ...state.status, demoMode: enabled },
    })),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));

// ── Sensor Store ──
interface SensorStoreState {
  sensors: SensorState;
  lastUpdate: string | null;
  updateSensor: (type: keyof SensorState, reading: SensorState[keyof SensorState]) => void;
  updateAllSensors: (data: Partial<SensorState>) => void;
}

export const useSensorStore = create<SensorStoreState>((set) => ({
  sensors: {
    temperature: null,
    humidity: null,
    brightness: null,
    motion: null,
    presence: null,
    voltage: null,
    current: null,
    power: null,
    energy: null,
  },
  lastUpdate: null,
  updateSensor: (type, reading) =>
    set((state) => ({
      sensors: { ...state.sensors, [type]: reading },
      lastUpdate: new Date().toISOString(),
    })),
  updateAllSensors: (data) =>
    set((state) => ({
      sensors: { ...state.sensors, ...data },
      lastUpdate: new Date().toISOString(),
    })),
}));

// ── Device Store ──
interface DeviceStoreState {
  devices: Device[];
  setDevices: (devices: Device[]) => void;
  updateDevice: (id: string, update: Partial<Device>) => void;
}

export const useDeviceStore = create<DeviceStoreState>((set) => ({
  devices: [],
  setDevices: (devices) => set({ devices }),
  updateDevice: (id, update) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === id ? { ...d, ...update } : d
      ),
    })),
}));

// ── Alert Store ──
interface AlertStoreState {
  alerts: Alert[];
  unreadCount: number;
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (id: number) => void;
  resolveAlert: (id: number) => void;
}

export const useAlertStore = create<AlertStoreState>((set) => ({
  alerts: [],
  unreadCount: 0,
  setAlerts: (alerts) =>
    set({
      alerts,
      unreadCount: alerts.filter((a) => a.state === 'active').length,
    }),
  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      unreadCount: state.unreadCount + 1,
    })),
  acknowledgeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id
          ? { ...a, state: 'acknowledged' as const, acknowledged_at: new Date().toISOString() }
          : a
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  resolveAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id
          ? { ...a, state: 'resolved' as const, resolved_at: new Date().toISOString() }
          : a
      ),
    })),
}));

// ── Notification Store ──
interface NotificationStoreState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        {
          ...notification,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...state.notifications,
      ].slice(0, 100),
    })),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  clearAll: () => set({ notifications: [] }),
}));

// ── Device Health Store ──
interface DeviceHealthStoreState {
  healthData: DeviceHealth[];
  setHealthData: (data: DeviceHealth[]) => void;
}

export const useDeviceHealthStore = create<DeviceHealthStoreState>((set) => ({
  healthData: [],
  setHealthData: (data) => set({ healthData: data }),
}));
