import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://openapi.tigerfintech.com',
        changeOrigin: true,
        secure: false,
        headers: {
          'tiger-client-type': 'web'
        }
      },
      '/finnhub': {
        target: 'https://finnhub.io/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/finnhub/, '')
      }
    }
  }
})
