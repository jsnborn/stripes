import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // src/graph is pure TypeScript, so no DOM environment is needed yet.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
