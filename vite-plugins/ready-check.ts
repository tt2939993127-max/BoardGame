/**
 * Vite 插件：提供就绪检查端点
 * 
 * 在 Vite 完全就绪后才响应 /__ready 端点
 * 用于 E2E 测试等待服务器真正就绪
 */

import type { Plugin } from 'vite';

const READY_DELAY_MS = 1000;

export function readyCheckPlugin(): Plugin {
  let isReady = false;
  let readyTimer: NodeJS.Timeout | null = null;

  const clearReadyTimer = () => {
    if (!readyTimer) return;
    clearTimeout(readyTimer);
    readyTimer = null;
  };

  const markNotReady = () => {
    clearReadyTimer();
    isReady = false;
  };

  const scheduleReady = () => {
    markNotReady();
    readyTimer = setTimeout(() => {
      isReady = true;
      console.log('✅ Vite 服务器已就绪（/__ready 端点可用）');
    }, READY_DELAY_MS);
  };

  return {
    name: 'ready-check',
    
    // 在服务器启动后设置就绪标志
    configureServer(server) {
      const originalListen = server.listen.bind(server) as typeof server.listen;
      server.listen = (async (...args: Parameters<typeof originalListen>) => {
        const result = await originalListen(...args);
        server.httpServer?.once('close', markNotReady);
        scheduleReady();
        return result;
      }) as typeof server.listen;

      if (server.httpServer?.listening) {
        scheduleReady();
      }

      // 添加就绪检查端点
      server.middlewares.use('/__ready', (req, res) => {
        if (isReady) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ready: true, timestamp: Date.now() }));
        } else {
          res.statusCode = 503; // Service Unavailable
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ready: false, message: 'Server is starting...' }));
        }
      });
    },
  };
}
