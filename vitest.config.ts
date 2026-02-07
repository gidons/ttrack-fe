import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // Inline problematic ESM deps so Vite can handle their CSS imports during transform
    deps: {
      inline: ['@mui/x-data-grid', '@mui/material'],
    },
  },
})
