import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    passWithNoTests: true,
    setupFiles: ['./src/setupTests.ts'],
    exclude: [
      ...configDefaults.exclude,
      'holding/**'
    ],
    // Inline problematic ESM deps so Vite can handle their CSS imports during transform
    deps: {
      inline: ['@mui/x-data-grid', '@mui/material'],
    },
  },
})
