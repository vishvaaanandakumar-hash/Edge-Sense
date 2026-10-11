// ============================================================
// EdgeSense — Sidebar Navigation
// ============================================================

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Activity,
  Zap,
  Bell,
  History,
  Brain,
  Settings,
  Info,
  Thermometer,
  Mic,
  Cpu,
  HeartPulse,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSystemStore } from '@/store';
import { sidebarVariants, sidebarLabelVariants } from '@/components/animations';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/monitoring', label: 'Live Monitoring', icon: <Thermometer size={20} /> },
  { path: '/voice', label: 'Voice Assistant', icon: <Mic size={20} /> },
  { path: '/analytics', label: 'Analytics', icon: <Brain size={20} /> },
  { path: '/energy', label: 'Energy', icon: <Zap size={20} /> },
  { path: '/predictive', label: 'Device Health', icon: <HeartPulse size={20} /> },
  { path: '/alerts', label: 'Alerts', icon: <Bell size={20} /> },
  { path: '/history', label: 'History', icon: <History size={20} /> },
  { path: '/hardware', label: 'Hardware', icon: <Cpu size={20} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  { path: '/about', label: 'About', icon: <Info size={20} /> },
];

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useSystemStore();
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      style={{
        height: '100vh',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-primary)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 1rem',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--es-orange), var(--es-orange-bright))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 12px rgba(255,122,26,0.3)',
          }}
        >
          <Activity size={20} color="white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                Edge<span style={{ color: 'var(--es-orange)' }}>Sense</span>
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                IoT Intelligence
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '0.75rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {navItems.map((item) => {
          const isActive = item.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: sidebarCollapsed ? '0.625rem' : '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: '0.875rem',
                transition: 'all var(--transition-fast)',
                position: 'relative',
                overflow: 'hidden',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background: 'var(--es-orange)',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span style={{ flexShrink: 0, display: 'flex', color: isActive ? 'var(--es-orange)' : undefined }}>
                {item.icon}
              </span>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        id="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 48,
          borderTop: '1px solid var(--border-primary)',
          background: 'transparent',
          border: 'none',
          borderTopStyle: 'solid',
          borderTopWidth: 1,
          borderTopColor: 'var(--border-primary)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'color var(--transition-fast)',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
      >
        {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </motion.aside>
  );
};

export default Sidebar;
