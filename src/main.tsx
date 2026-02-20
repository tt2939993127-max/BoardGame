import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// 触发所有游戏光标主题的自注册（副作用 import，必须在组件渲染前）
import './games/cursorRegistry';
// 初始化 i18n（语言检测 + 本地缓存）
import { i18nInitPromise } from './lib/i18n';
import App from './App.tsx';
import * as Sentry from '@sentry/react';
import { SENTRY_DSN } from './config/server';

// 初始化 Sentry（错误捕获 + 性能追踪 + 出错时低采样率回放）
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 1.0,
    // 常规会话不录制，仅出错时以 10% 采样率录制回放
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  // 立即渲染，不等 i18n 初始化完成。
  // react-i18next 已配置 useSuspense: false，未就绪时组件用 key 作 fallback，不会崩溃。
  // i18n 初始化完成后 react-i18next 会自动触发重渲染，文本无缝切换。
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // 后台继续等待 i18n 完成（仅用于错误捕获，不阻塞渲染）
  void i18nInitPromise.catch(() => {
    console.warn('[i18n] 初始化失败，将使用 fallback key 显示文本');
  });
}
