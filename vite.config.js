import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["qr-code-styling"],
  },
  // Vercel deploy runs at the domain root. Using a subpath base causes /assets/* 404s.
  base: '/',
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/__tests__.archive/**', '**/sql/__tests__.archive/**', '**/*.archive.*'],
    watchExclude: ['**/e2e/**', '**/__tests__.archive/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: ['src/test/**', 'src/**/__tests__.archive/**', 'src/main.jsx', 'src/router.jsx'],
      thresholds: { lines: 0, functions: 0, branches: 0, statements: 0 },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          xlsx: ['xlsx-js-style'],
        },
      },
    },
  },
})
