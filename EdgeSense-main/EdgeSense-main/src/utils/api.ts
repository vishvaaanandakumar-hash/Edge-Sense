// ============================================================
// EdgeSense — API Client Utility
// ============================================================

const API_BASE = '/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Network error — backend may be offline');
  }
}

export const api = {
  // System
  health: () => request<{ status: string; timestamp: string }>('/health'),
  systemStatus: () => request<any>('/system/status'),

  // Sensors
  currentReadings: () => request<any>('/sensors/current'),
  sensorHistory: (sensorType: string, window: string = '1h') =>
    request<any>(`/sensors/history/${sensorType}?window=${window}`),

  // Devices
  getDevices: () => request<any>('/devices'),
  controlDevice: (deviceId: string, command: string, payload?: any) =>
    request<any>(`/devices/${deviceId}/control`, {
      method: 'POST',
      body: JSON.stringify({ command, ...payload }),
    }),

  // Alerts
  getAlerts: (state?: string) =>
    request<any>(`/alerts${state ? `?state=${state}` : ''}`),
  acknowledgeAlert: (id: number) =>
    request<any>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  resolveAlert: (id: number) =>
    request<any>(`/alerts/${id}/resolve`, { method: 'POST' }),

  // Alert Rules
  getAlertRules: () => request<any>('/alerts/rules'),
  createAlertRule: (rule: any) =>
    request<any>('/alerts/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),
  updateAlertRule: (id: number, rule: any) =>
    request<any>(`/alerts/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    }),
  deleteAlertRule: (id: number) =>
    request<any>(`/alerts/rules/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: (period: string = '24h') =>
    request<any>(`/analytics?period=${period}`),

  // Energy
  getEnergy: (period: string = '24h') =>
    request<any>(`/energy?period=${period}`),

  // Device Health / Predictive
  getDeviceHealth: () => request<any>('/devices/health'),

  // History / Activity
  getActivityHistory: (params: {
    page?: number;
    per_page?: number;
    type?: string;
    search?: string;
    from?: string;
    to?: string;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) searchParams.set(k, String(v));
    });
    return request<any>(`/history?${searchParams.toString()}`);
  },

  // History CSV Export
  exportHistory: async (params: {
    type?: string;
    from?: string;
    to?: string;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) searchParams.set(k, String(v));
    });
    const response = await fetch(`${API_BASE}/history/export?${searchParams.toString()}`);
    return response.blob();
  },

  // Settings
  getSettings: () => request<any>('/settings'),
  updateSettings: (settings: any) =>
    request<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  // Hardware
  getHardwareStatus: () => request<any>('/hardware/status'),
  connectHardware: (port: string, baudRate: number) =>
    request<any>('/hardware/connect', {
      method: 'POST',
      body: JSON.stringify({ port, baud_rate: baudRate }),
    }),
  disconnectHardware: () =>
    request<any>('/hardware/disconnect', { method: 'POST' }),
  listSerialPorts: () => request<any>('/hardware/ports'),

  // Demo
  resetDemoData: () =>
    request<any>('/demo/reset', { method: 'POST' }),
  toggleDemoMode: (enabled: boolean) =>
    request<any>('/demo/toggle', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  // Voice
  getVoiceHistory: () => request<any>('/voice/history'),
};

export default api;
