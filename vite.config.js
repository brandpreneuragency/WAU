import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // When building on GitHub Actions for a project site, GITHUB_REPOSITORY is
  // available and we can infer the repo name to set the correct `base`.
  const repo = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : ''
  const base = repo ? `/${repo}/` : '/'

  return {
    base,
    plugins: [react()],
  }
})
