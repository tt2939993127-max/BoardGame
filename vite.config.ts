import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
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
    },
  }
})
