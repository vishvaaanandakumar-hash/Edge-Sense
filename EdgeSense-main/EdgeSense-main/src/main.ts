import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { initSocket } from '@/utils/socket';
import { useThemeStore } from '@/store';

const rootElement = document.querySelector<HTMLDivElement>('#app');

if (!rootElement) {
  throw new Error('EdgeSense mount element #app was not found.');
}

const applyTheme = () => {
  const { theme, resolvedTheme } = useThemeStore.getState();
  const resolved = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : resolvedTheme;
  document.documentElement.dataset.theme = resolved;
};

applyTheme();
useThemeStore.subscribe(applyTheme);
initSocket();

createRoot(rootElement).render(
  React.createElement(React.StrictMode, null, React.createElement(App)),
);
