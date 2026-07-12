import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages 是子路徑（/classroom-webapp/），但本機開發還是用根目錄比較方便
export default defineConfig(({ command }) => ({
  plugins: [vue()],
  base: command === 'build' ? '/classroom-webapp/' : '/',
}))
