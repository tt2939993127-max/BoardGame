import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import localeHashPlugin from './plugins/vite-locale-hash'
import { readyCheckPlugin } from './vite-plugins/ready-check'

const readCliFlag = (flagName: string): string | undefined => {
  const prefix = `--${flagName}=`
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (arg === `--${flagName}`) {
      const next = process.argv[i + 1]
      return next && !next.startsWith('-') ? next : undefined
    }

    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length)
    }
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const cliPort = Number(readCliFlag('port'))
  const cliHost = readCliFlag('host')
  const devPort = Number.isFinite(cliPort) && cliPort > 0
    ? cliPort
    : Number(env.VITE_DEV_PORT) || 5173
  const serverHost = cliHost || '0.0.0.0'
  const hmrHost = cliHost && cliHost !== '0.0.0.0' ? cliHost : 'localhost'
  const gameServerPort = Number(env.GAME_SERVER_PORT) || 18000
  const apiServerPort = Number(env.API_SERVER_PORT) || 18001
  const suppressE2EProxyNoise = env.E2E_PROXY_QUIET === 'true'

  const isIgnorableProxyError = (err: Error & NodeJS.ErrnoException) => {
    if (err.code === 'ECONNABORTED') return true
    if (!suppressE2EProxyNoise) return false
    return err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'EPIPE'
  }

  const logProxyError = (label: string, err: Error & NodeJS.ErrnoException) => {
    if (isIgnorableProxyError(err)) return
    console.error(`[proxy ${label}]`, err.message)
  }

  return {
    plugins: [
      // 屏蔽 public/ 目录 import 警告，@locales alias 会内联打包 i18n JSON。
      {
        name: 'suppress-public-dir-warning',
        enforce: 'pre' as const,
        configResolved(config) {
          const originalWarn = config.logger.warn
          config.logger.warn = (msg, options) => {
            if (typeof msg === 'string' && msg.includes('Assets in public directory cannot be imported')) {
              return
            }
            originalWarn(msg, options)
          }
        },
      },
      {
        name: 'suppress-e2e-proxy-noise',
        enforce: 'pre' as const,
        configResolved(config) {
          if (!suppressE2EProxyNoise) return
          const originalError = config.logger.error
          config.logger.error = (msg, options) => {
            if (typeof msg === 'string' && msg.includes('ws proxy error')) return
            originalError(msg, options)
          }
        },
      },
      react(),
      localeHashPlugin(),
      readyCheckPlugin(), // 添加就绪检查插件。
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // 重型第三方库拆成独立 chunk，便于并行加载与长期缓存。
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-socket': ['socket.io-client'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-http-backend', 'i18next-browser-languagedetector'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-howler': ['howler'],
          },
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        // 允许 src/ 中代码 import public/locales/ 下的 JSON，用于 i18n 内联打包。
        // Vite 默认禁止 import public/ 文件，这里通过 alias 绕过限制且不产生重复文件。
        '@locales': path.resolve(__dirname, './public/locales'),
      },
    },
    optimizeDeps: {
      entries: ['index.html'],
    },
    server: {
      host: serverHost,
      port: devPort,
      strictPort: true,
      // HMR 必须跟随实际启动端口，否则独立 Vite 会把 ws 重新绑回 5173。
      hmr: {
        protocol: 'ws',
        host: hmrHost,
        port: devPort,
        clientPort: devPort,
      },
      // 排除测试产物、临时目录和配置文件，避免 E2E/脚本写盘触发开发页抖动。
      watch: {
        // 使用轮询模式，避免 Windows 原生文件监听器崩溃。
        usePolling: true,
        interval: 1000, // 轮询间隔 1 秒
        ignored: [
          '**/test-results/**',
          '**/playwright-report/**',
          '**/.tmp/**',
          '**/temp/**',
          '**/tmp/**',
          '**/evidence/**',
          '**/logs/**',
          '**/node_modules/**',
          '**/*.test.*',
          '**/*.spec.*',
          '**/e2e/**',
          '**/.tmp-*',
          '**/.env', // 禁止监听 .env，避免环境变量变动触发重启。
          '**/.env.*', // 禁止监听 .env.*，如 .env.local、.env.production。
          '**/playwright.config.*', // 禁止监听 Playwright 配置文件。
          '**/vitest.config.*', // 禁止监听 Vitest 配置文件。
          '**/vite.config.*', // 禁止监听 Vite 配置文件，避免循环重启。
        ],
      },
      proxy: {
        '/games': {
          target: `http://127.0.0.1:${gameServerPort}`,
          changeOrigin: true,
        },
        // socket.io 传输层，/game namespace 用于游戏状态同步。
        '/socket.io': {
          target: `http://127.0.0.1:${gameServerPort}`,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              logProxyError('/socket.io', err)
            })
          },
        },
        '/lobby-socket': {
          target: `http://127.0.0.1:${gameServerPort}`,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              logProxyError('/lobby-socket', err)
            })
          },
        },
        '/auth': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
        '/game-changelogs': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
        '/admin': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept?.includes('text/html')) {
              return req.url
            }
          },
        },
        '/feedback': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
        '/sponsors': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
        '/notifications': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
        '/social-socket': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              logProxyError('/social-socket', err)
            })
          },
        },
        '/ugc': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
        // UGC 上传资源代理到后端 uploads/ 目录。
        // public/assets/ 下的静态资源仍由 Vite 直接提供。
        '/assets/ugc': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
        // 头像上传资源代理。
        '/assets/avatars': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
        '/layout': {
          target: `http://127.0.0.1:${apiServerPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})
