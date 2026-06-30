import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages 项目页需要 base = '/仓库名/'，用户页 / 则留空。
// 构建时通过环境变量注入：VITE_BASE=/my-repo/ npx vite build
const BASE = process.env.VITE_BASE || "/";

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
