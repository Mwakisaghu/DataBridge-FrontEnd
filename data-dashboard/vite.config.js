import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// The UI talks to the DataBridge server through this dev server: requests to /api and
// /health are forwarded, so the browser sees one origin (no CORS) and the server can stay
// on 127.0.0.1. Point at another server with DATABRIDGE_API=http://host:port npm run dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.DATABRIDGE_API || 'http://127.0.0.1:8085'
  const proxy = {
    '/api': { target, changeOrigin: true },
    '/health': { target, changeOrigin: true },
  }
  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      css: false,
      clearMocks: true,
      testTimeout: 20000,
    },
  }
})
