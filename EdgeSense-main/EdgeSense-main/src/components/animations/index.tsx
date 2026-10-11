// ============================================================
// EdgeSense — Animation Components Library
// 16 distinct reusable animation patterns
// ============================================================

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { useSettingsStore } from '@/store';

// Helper: check if animations are enabled
function useAnimationEnabled() {
  const { settings } = useSettingsStore();
  return settings.animation_intensity !== 'none' && !settings.reduced_motion;
}

function getAnimationScale() {
  const { settings } = useSettingsStore.getState();
  if (settings.animation_intensity === 'none' || settings.reduced_motion) return 0;
  if (settings.animation_intensity === 'reduced') return 0.5;
  return 1;
}

// ═══════════════════════════════════════════════════════
// 1. INFINITY LOOP HERO ANIMATION
// ═══════════════════════════════════════════════════════
export const InfinityLoopAnimation: React.FC<{ className?: string }> = ({ className }) => {
  const enabled = useAnimationEnabled();
  if (!enabled) return null;

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden' }}>
      <svg viewBox="0 0 400 150" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="infinityGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF7A1A" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#FFE8A3" stopOpacity="1" />
            <stop offset="100%" stopColor="#FF7A1A" stopOpacity="0.8" />
          </linearGradient>
          <filter id="infinityGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background path */}
        <path
          d="M100,75 C100,30 150,30 200,75 C250,120 300,120 300,75 C300,30 250,30 200,75 C150,120 100,120 100,75 Z"
          fill="none"
          stroke="rgba(255,122,26,0.1)"
          strokeWidth="2"
        />
        {/* Animated trail */}
        <motion.path
          d="M100,75 C100,30 150,30 200,75 C250,120 300,120 300,75 C300,30 250,30 200,75 C150,120 100,120 100,75 Z"
          fill="none"
          stroke="url(#infinityGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          filter="url(#infinityGlow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ strokeDasharray: 1, strokeDashoffset: 0 }}
        />
        {/* Moving particle */}
        <motion.circle
          r="4"
          fill="#FF7A1A"
          filter="url(#infinityGlow)"
          animate={{
            offsetDistance: ['0%', '100%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            offsetPath: `path("M100,75 C100,30 150,30 200,75 C250,120 300,120 300,75 C300,30 250,30 200,75 C150,120 100,120 100,75 Z")`,
          }}
        />
      </svg>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// 2. LOGO REVEAL ANIMATION
// ═══════════════════════════════════════════════════════
export const LogoReveal: React.FC<{
  children: React.ReactNode;
  onComplete?: () => void;
}> = ({ children, onComplete }) => {
  const enabled = useAnimationEnabled();

  return (
    <motion.div
      initial={enabled ? { opacity: 0, scale: 0.8, filter: 'blur(10px)' } : undefined}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{
        duration: enabled ? 0.8 : 0,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      onAnimationComplete={onComplete}
    >
      {children}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════
// 3. AMBIENT RADIAL GLOW
// ═══════════════════════════════════════════════════════
export const AmbientGlow: React.FC<{
  color?: string;
  intensity?: number;
  className?: string;
}> = ({ color = '#FF7A1A', intensity = 0.15, className }) => {
  const enabled = useAnimationEnabled();

  return (
    <motion.div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: `radial-gradient(ellipse at 50% 0%, ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
      }}
      animate={enabled ? {
        opacity: [0.5, 1, 0.5],
      } : undefined}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════
// 4. STAGGERED CARD ENTRANCE
// ═══════════════════════════════════════════════════════
export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  style?: React.CSSProperties;
}> = ({ children, className, staggerDelay = 0.05, style }) => {
  const enabled = useAnimationEnabled();

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: enabled ? staggerDelay : 0,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const enabled = useAnimationEnabled();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: enabled ? { opacity: 0, y: 20, scale: 0.97 } : { opacity: 1 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════
// 5. ANIMATED NUMBER COUNTER
// ═══════════════════════════════════════════════════════
export const AnimatedNumber: React.FC<{
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ value, decimals = 1, duration = 0.6, prefix = '', suffix = '', className, style }) => {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState('0');
  const enabled = useAnimationEnabled();
  const prevValue = useRef(value);

  useEffect(() => {
    if (!enabled) {
      setDisplay(value.toFixed(decimals));
      return;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v.toFixed(decimals)),
    });
    prevValue.current = value;
    return controls.stop;
  }, [value, enabled, decimals, duration]);

  return (
    <span className={className} style={style}>
      {prefix}{display}{suffix}
    </span>
  );
};

// ═══════════════════════════════════════════════════════
// 6. LIVE DATA PULSE
// ═══════════════════════════════════════════════════════
export const DataPulse: React.FC<{
  active?: boolean;
  color?: string;
  size?: number;
}> = ({ active = true, color = 'var(--es-success)', size = 10 }) => {
  const enabled = useAnimationEnabled();

  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: active ? color : 'var(--es-grey-dark)',
        position: 'relative',
      }}
    >
      {active && enabled && (
        <motion.span
          style={{
            position: 'absolute',
            inset: -3,
            borderRadius: '50%',
            border: `2px solid ${color}`,
          }}
          animate={{
            scale: [1, 1.8],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}
    </span>
  );
};

// ═══════════════════════════════════════════════════════
// 7. AUDIO WAVEFORM / EQUALIZER
// ═══════════════════════════════════════════════════════
export const AudioWaveform: React.FC<{
  isActive?: boolean;
  bars?: number;
  className?: string;
}> = ({ isActive = false, bars = 24, className }) => {
  const enabled = useAnimationEnabled();

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        height: 48,
      }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            background: `linear-gradient(to top, var(--es-orange), var(--es-yellow))`,
            opacity: isActive ? 0.9 : 0.2,
          }}
          animate={
            isActive && enabled
              ? {
                  height: [8, 20 + Math.random() * 28, 8],
                }
              : { height: 4 }
          }
          transition={{
            duration: 0.4 + Math.random() * 0.3,
            repeat: isActive ? Infinity : 0,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: i * 0.03,
          }}
        />
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// 8. CHART PROGRESSIVE REVEAL
// ═══════════════════════════════════════════════════════
export const ChartReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const enabled = useAnimationEnabled();

  return (
    <motion.div
      className={className}
      initial={enabled ? { opacity: 0, clipPath: 'inset(0 100% 0 0)' } : undefined}
      animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════
// 9. DEVICE SWITCH WITH TACTILE FEEDBACK
// ═══════════════════════════════════════════════════════
export const DeviceSwitch: React.FC<{
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
  label?: string;
  id: string;
}> = ({ isOn, onToggle, disabled = false, label, id }) => {
  const enabled = useAnimationEnabled();

  return (
    <button
      id={id}
      onClick={onToggle}
      disabled={disabled}
      aria-label={label || 'Toggle device'}
      aria-pressed={isOn}
      style={{
        width: 56,
        height: 30,
        borderRadius: 'var(--radius-full)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative',
        background: isOn ? 'var(--es-orange)' : 'var(--bg-hover)',
        boxShadow: isOn ? '0 0 16px var(--es-orange-glow-strong)' : 'none',
        transition: 'background 0.3s, box-shadow 0.3s',
        opacity: disabled ? 0.5 : 1,
        padding: 0,
      }}
    >
      <motion.div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'white',
          position: 'absolute',
          top: 3,
          boxShadow: 'var(--shadow-sm)',
        }}
        animate={{
          left: isOn ? 29 : 3,
          scale: enabled ? [1, 1.1, 1] : 1,
        }}
        transition={{
          left: { type: 'spring', stiffness: 500, damping: 30 },
          scale: { duration: 0.2 },
        }}
      />
    </button>
  );
};

// ═══════════════════════════════════════════════════════
// 10. THEME TRANSITION
// ═══════════════════════════════════════════════════════
export const ThemeTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════
// 11. SIDEBAR COLLAPSE ANIMATION (used via layout)
// ═══════════════════════════════════════════════════════
export const sidebarVariants = {
  expanded: {
    width: 260,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
  collapsed: {
    width: 72,
    transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
  },
};

export const sidebarLabelVariants = {
  expanded: { opacity: 1, x: 0, display: 'block' },
  collapsed: { opacity: 0, x: -10, display: 'none', transition: { display: { delay: 0.15 } } },
};

// ═══════════════════════════════════════════════════════
// 12. NOTIFICATION TOAST
// ═══════════════════════════════════════════════════════
export const ToastContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'fixed',
      top: 80,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 380,
    }}
  >
    <AnimatePresence mode="popLayout">{children}</AnimatePresence>
  </div>
);

export const Toast: React.FC<{
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onDismiss: () => void;
}> = ({ id, title, message, type, onDismiss }) => {
  const colorMap = {
    info: 'var(--es-info)',
    success: 'var(--es-success)',
    warning: 'var(--es-warning)',
    error: 'var(--es-error)',
  };

  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        background: 'var(--bg-elevated)',
        borderLeft: `3px solid ${colorMap[type]}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        boxShadow: 'var(--shadow-lg)',
        cursor: 'pointer',
        border: '1px solid var(--border-primary)',
      }}
      onClick={onDismiss}
    >
      <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{message}</div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════
// 13. NETWORK NODE ANIMATION
// ═══════════════════════════════════════════════════════
export const NetworkNodes: React.FC<{ className?: string }> = ({ className }) => {
  const enabled = useAnimationEnabled();
  if (!enabled) return null;

  const nodes = [
    { x: 60, y: 40, label: 'ESP32' },
    { x: 180, y: 30, label: 'DHT22' },
    { x: 300, y: 50, label: 'PIR' },
    { x: 180, y: 100, label: 'Server' },
    { x: 60, y: 110, label: 'LDR' },
    { x: 300, y: 110, label: 'Web' },
  ];

  const edges = [
    [0, 3], [1, 3], [2, 3], [4, 3], [3, 5], [0, 1], [0, 4],
  ];

  return (
    <svg viewBox="0 0 360 150" className={className} style={{ width: '100%', height: '150px' }}>
      {edges.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="var(--es-orange)"
          strokeWidth="1"
          strokeOpacity="0.3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: i * 0.1 }}
        />
      ))}
      {/* Data particle on edge 0→3 */}
      <motion.circle
        r="3"
        fill="var(--es-yellow)"
        animate={{
          cx: [nodes[0].x, nodes[3].x],
          cy: [nodes[0].y, nodes[3].y],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
      <motion.circle
        r="3"
        fill="var(--es-orange)"
        animate={{
          cx: [nodes[3].x, nodes[5].x],
          cy: [nodes[3].y, nodes[5].y],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: 1 }}
      />
      {nodes.map((node, i) => (
        <g key={i}>
          <motion.circle
            cx={node.x}
            cy={node.y}
            r="16"
            fill="var(--bg-elevated)"
            stroke="var(--es-orange)"
            strokeWidth="1.5"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.08, type: 'spring' }}
          />
          <text
            x={node.x}
            y={node.y + 4}
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontSize="7"
            fontFamily="var(--font-sans)"
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════
// 14. HEALTH RING / CIRCULAR PROGRESS
// ═══════════════════════════════════════════════════════
export const HealthRing: React.FC<{
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}> = ({ value, size = 80, strokeWidth = 6, label, className }) => {
  const enabled = useAnimationEnabled();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = (v: number) => {
    if (v >= 80) return 'var(--es-success)';
    if (v >= 50) return 'var(--es-warning)';
    return 'var(--es-error)';
  };

  return (
    <div className={className} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-primary)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(value)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: enabled ? 1 : 0, ease: 'easeOut' }}
        />
      </svg>
      <div style={{
        position: 'relative',
        marginTop: -size - 4,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <AnimatedNumber value={value} decimals={0} suffix="%" className="es-number-animate"
          style={{ fontSize: size * 0.2, fontWeight: 700, color: getColor(value) } as any}
        />
      </div>
      {label && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>{label}</span>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// 15. TIMELINE REVEAL
// ═══════════════════════════════════════════════════════
export const TimelineReveal: React.FC<{
  children: React.ReactNode;
  index: number;
}> = ({ children, index }) => {
  const enabled = useAnimationEnabled();

  return (
    <motion.div
      initial={enabled ? { opacity: 0, x: -20 } : undefined}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════
// 16. SKELETON SHIMMER
// ═══════════════════════════════════════════════════════
export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}> = ({ width = '100%', height = 20, borderRadius, className }) => (
  <div
    className={`es-skeleton ${className || ''}`}
    style={{ width, height, borderRadius: borderRadius || 'var(--radius-md)' }}
  />
);

export const SkeletonCard: React.FC = () => (
  <div className="es-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Skeleton height={14} width="60%" />
    <Skeleton height={32} width="40%" />
    <Skeleton height={10} width="80%" />
  </div>
);

// ═══════════════════════════════════════════════════════
// PAGE TRANSITION WRAPPER
// ═══════════════════════════════════════════════════════
export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const enabled = useAnimationEnabled();
  
  return (
    <motion.div
      initial={enabled ? { opacity: 0, y: 12 } : undefined}
      animate={{ opacity: 1, y: 0 }}
      exit={enabled ? { opacity: 0, y: -12 } : undefined}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};
