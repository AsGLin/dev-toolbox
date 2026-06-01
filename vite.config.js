import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/dev-toolbox/',
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  define: {
    __VERSION__: JSON.stringify('1.0.1'),
  },
  build: {
    outDir: 'dist',
  },
})
