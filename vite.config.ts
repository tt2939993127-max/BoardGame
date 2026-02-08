import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(env.VITE_DEV_PORT) || 5173

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
    },
    server: {
      host: '0.0.0.0',
      port: devPort,
      strictPort: true,
      // 排除测试产物目录，避免 Playwright 写入截图/报告时触发 HMR full-reload
      watch: {
        ignored: ['**/test-results/**', '**/playwright-report/**', '**/.tmp/**', '**/evidence/**'],
      },
      proxy: {
        '/games': {
          target: 'http://127.0.0.1:18000',
          changeOrigin: true,
        },
        // boardgame.io multiplayer uses socket.io under `/socket.io`.
        '/socket.io': {
          target: 'http://127.0.0.1:18000',
          changeOrigin: true,
          ws: true,
        },
        '/lobby-socket': {
          target: 'http://127.0.0.1:18000',
          changeOrigin: true,
          ws: true,
        },
        '/auth': {
          target: 'http://127.0.0.1:18001',
          changeOrigin: true,
        },
        '/admin': {
          target: 'http://127.0.0.1:18001',
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept?.includes('text/html')) {
              return req.url;
            }
          },
        },
        '/feedback': {
          target: 'http://127.0.0.1:18001',
          changeOrigin: true,
        },
        '/social-socket': {
          target: 'http://127.0.0.1:18001',
          changeOrigin: true,
          ws: true,
        },
        '/ugc': {
          target: 'http://127.0.0.1:18001',
          changeOrigin: true,
        },
        '/layout': {
          target: 'http://127.0.0.1:18001',
          changeOrigin: true,
        },

      },
    }
  }
})
