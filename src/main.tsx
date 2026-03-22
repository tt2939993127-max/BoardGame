import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './games/cursorRegistry';
import { i18nInitPromise } from './lib/i18n';
import App from './App.tsx';
import { SENTRY_DSN } from './config/server';

const STALE_CHUNK_RELOAD_KEY = 'bg_stale_chunk_reload_guard'

const isStaleChunkError = (value: unknown): boolean => {
  const message = value instanceof Error
    ? `${value.name}: ${value.message}`
    : String(value ?? '')

  const normalized = message.toLowerCase()
  return normalized.includes('failed to fetch dynamically imported module')
    || normalized.includes('importing a module script failed')
    || normalized.includes('expected a javascript module script')
    || normalized.includes('chunkloaderror')
    || normalized.includes('loading chunk')
}

const reloadForStaleChunkOnce = (reason: string) => {
  if (typeof window === 'undefined') return

  try {
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    const previous = sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)
    if (previous === current) {
      return
    }
    sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, current)
  } catch {
    // sessionStorage 不可用时降级为直接刷新一次
  }

  console.warn('[bootstrap] stale chunk detected, reloading page', { reason })
  window.location.reload()
}

const captureParams = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search)
  : null;
const captureScenario = captureParams?.get('bgCapture');
const captureStatusUrl = captureParams?.get('bgCaptureStatusUrl') || '/__capture/status';

const reportCaptureBootstrapStatus = (phase: string, message?: string) => {
  if (!import.meta.env.DEV || !captureScenario) {
    return;
  }

  void fetch(captureStatusUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scenario: captureScenario,
      phase,
      message,
    }),
  }).catch(() => {
    // capture 旁路诊断不能影响正常页面启动。
  });
};

if (import.meta.env.DEV && captureScenario) {
  document.title = `capture-bootstrap:${captureScenario}`;
  reportCaptureBootstrapStatus('capture-bootstrap');

  window.addEventListener('error', (event) => {
    const message = event.error instanceof Error
      ? event.error.message
      : (event.message || 'unknown');
    document.title = `capture-window-error:${message.slice(0, 80)}`;
    reportCaptureBootstrapStatus('capture-window-error', message.slice(0, 400));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? event.reason.message
      : String(event.reason ?? 'unknown');
    document.title = `capture-window-rejection:${reason.slice(0, 80)}`;
    reportCaptureBootstrapStatus('capture-window-rejection', reason.slice(0, 400));
  });
}

if (import.meta.env.DEV) {
  Error.stackTraceLimit = 10;
}

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadForStaleChunkOnce('vite:preloadError')
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (!isStaleChunkError(event.reason)) return
    event.preventDefault()
    reloadForStaleChunkOnce('unhandledrejection')
  })
}

if (SENTRY_DSN) {
  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
      ],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.1,
    });
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  if (import.meta.env.DEV && captureScenario) {
    document.title = `capture-rendered:${captureScenario}`;
    reportCaptureBootstrapStatus('capture-rendered');
  }

  void i18nInitPromise.catch(() => {
    console.warn('[i18n] 初始化失败，将使用 fallback key 显示文本');
    reportCaptureBootstrapStatus('capture-i18n-init-failed', 'i18n initialization failed');
  });
}
