import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages 用子路徑（/classroom-webapp/），由 workflow 設 VITE_BASE_PATH 帶入；
// Cloudflare Pages、未來的自訂網域、本機開發都是從根目錄服務，預設值 '/' 就對了。
export default defineConfig({
  plugins: [vue()],
  base: process.env.VITE_BASE_PATH || '/',
})
