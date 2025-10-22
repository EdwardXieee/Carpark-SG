import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase =
    env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? ''
  const proxy = apiBase
    ? {
        '/api': {
          target: apiBase,
          changeOrigin: true,
          secure: false,
        },
      }
    : undefined

  return {
    plugins: [
      react({
        babel: {
          plugins: [['babel-plugin-react-compiler']],
        },
      }),
    ],
    server: proxy
      ? {
          proxy,
        }
      : undefined,
  }
})
