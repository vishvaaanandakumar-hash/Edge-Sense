import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Dashboard from '@/pages/Dashboard';
import LiveMonitoring from '@/pages/LiveMonitoring';
import EnergyPage from '@/pages/EnergyPage';
import AlertsPage from '@/pages/AlertsPage';
import VoicePage from '@/pages/VoicePage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import HistoryPage from '@/pages/HistoryPage';
import HardwarePage from '@/pages/HardwarePage';
import PredictiveHealth from '@/pages/PredictiveHealth';
import SettingsPage from '@/pages/SettingsPage';
import AboutPage from '@/pages/AboutPage';

const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="es-page">
    <div className="es-page-header">
      <div className="es-badge es-badge-warning">Module in progress</div>
      <h1 className="es-page-title">{title}</h1>
      <p className="es-page-subtitle">{description}</p>
    </div>
    <div className="es-card" style={{ maxWidth: 720 }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
        This route is wired into the EdgeSense shell. Its feature implementation is not present in the current workspace yet.
      </p>
    </div>
  </div>
);

const App: React.FC = () => (
  <BrowserRouter>
    <div className="es-app">
      <Sidebar />
      <div className="es-main">
        <Topbar />
        <main className="es-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monitoring" element={<LiveMonitoring />} />
            <Route path="/energy" element={<EnergyPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/voice" element={<VoicePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/predictive" element={<PredictiveHealth />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/hardware" element={<HardwarePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  </BrowserRouter>
);

export default App;