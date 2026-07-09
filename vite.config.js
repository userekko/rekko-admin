import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed as a GitHub Pages project site at
// https://userekko.github.io/rekko-admin/ — base must match the repo name.
export default defineConfig({
  plugins: [react()],
  base: '/rekko-admin/',
})
