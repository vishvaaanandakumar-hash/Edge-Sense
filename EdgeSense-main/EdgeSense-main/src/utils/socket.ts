// ============================================================
// EdgeSense — WebSocket Connection Manager
// ============================================================

import { io, Socket } from 'socket.io-client';
import { useSensorStore, useDeviceStore, useAlertStore, useSystemStore } from '@/store';

let socket: Socket | null = null;

export function initSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(window.location.origin, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[EdgeSense] WebSocket connected');
    useSystemStore.getState().setStatus({ backend: 'online' });
  });

  socket.on('disconnect', (reason) => {
    console.warn('[EdgeSense] WebSocket disconnected:', reason);
    useSystemStore.getState().setStatus({ backend: 'offline' });
  });

  socket.on('connect_error', () => {
    useSystemStore.getState().setStatus({ backend: 'error' });
  });

  // Real-time sensor updates
  socket.on('sensor_update', (data: any) => {
    if (data && typeof data === 'object') {
      useSensorStore.getState().updateAllSensors(data);
      useSystemStore.getState().setStatus({
        lastUpdate: new Date().toISOString(),
      });
    }
  });

  // Device state updates
  socket.on('device_update', (data: any) => {
    if (data?.devices) {
      useDeviceStore.getState().setDevices(data.devices);
    } else if (data?.device_id) {
      useDeviceStore.getState().updateDevice(data.device_id, data);
    }
  });

  // Alert updates
  socket.on('alert', (data: any) => {
    if (data) {
      useAlertStore.getState().addAlert(data);
    }
  });

  // ESP32 connection status
  socket.on('hardware_status', (data: any) => {
    if (data?.esp32) {
      useSystemStore.getState().setStatus({ esp32: data.esp32 });
    }
    if (data?.bluetooth) {
      useSystemStore.getState().setStatus({ bluetooth: data.bluetooth });
    }
  });

  // System status broadcast
  socket.on('system_status', (data: any) => {
    if (data) {
      useSystemStore.getState().setStatus(data);
    }
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
