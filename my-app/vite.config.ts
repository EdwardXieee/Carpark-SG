import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const envBase = env.VITE_API_BASE_URL?.trim()
  const fallbackBase = 'http://api-cs5224-app.wanioco.com'
  const baseUrl = (envBase && envBase.length > 0 ? envBase : fallbackBase).replace(/\/$/, '')

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: baseUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
