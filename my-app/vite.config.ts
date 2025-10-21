import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      // 将所有 /api 开头的请求 转发到 目标服务器
      '/api': {
        target: 'http://api-cs5224-app.wanioco.com', // 你的真实 API 地址
        changeOrigin: true, // 必须设置为 true，欺骗后端服务器，让它以为请求来自同源
      },
    },
  },
})
