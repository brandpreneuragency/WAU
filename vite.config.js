import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // For GitHub Pages we need the repo subpath in production. Keep dev at '/'.
  const base = mode === 'production' ? '/WAU/' : '/'

  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
    },
  }
})
