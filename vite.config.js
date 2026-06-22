import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.js', 'test/**/*.{test,spec}.js'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'node'
  }
})
