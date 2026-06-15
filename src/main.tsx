import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Suppress benign WebSocket errors and Supabase lock warnings from Vite/Environment
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args) => {
    const msg = args[0]?.toString() || '';
    if (msg.includes('[vite] failed to connect to websocket') || 
        msg.includes('WebSocket connection to') || 
        msg.includes('WebSocket closed without opened') ||
        msg.includes('mismatch between server and client bindings') ||
        msg.includes('@supabase/gotrue-js: Lock') ||
        msg.includes('was not released within 5000ms') ||
        msg.includes('orphaned lock')) {
      return;
    }
    originalError(...args);
  };

  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args[0]?.toString() || '';
    if (msg.includes('@supabase/gotrue-js: Lock') ||
        msg.includes('was not released within 5000ms') ||
        msg.includes('orphaned lock') ||
        msg.includes('WebSocket closed without opened') ||
        msg.includes('failed to connect to websocket')) {
      return;
    }
    originalWarn(...args);
  };

  const isWebSocketError = (str: string) => {
    return str.includes('WebSocket closed without opened') || 
           str.includes('[vite]') ||
           str.includes('failed to connect to websocket') ||
           str.includes('mismatch between server and client bindings');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const reasonStr = reason?.toString() || '';
    const msgStr = reason?.message || '';
    const errorStr = String(reason || '');
    
    if (isWebSocketError(reasonStr) || isWebSocketError(msgStr) || isWebSocketError(errorStr)) {
      event.preventDefault();
      event.stopPropagation();
      try {
        event.stopImmediatePropagation();
      } catch (e) {}
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    const errorStr = event.error?.toString() || '';
    if (isWebSocketError(msg) || isWebSocketError(errorStr)) {
      event.preventDefault();
      event.stopPropagation();
      try {
        event.stopImmediatePropagation();
      } catch (e) {}
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
