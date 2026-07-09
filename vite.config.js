import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed at the custom domain https://admin.userekko.com/ (via the
// public/CNAME file) — served from the domain root, not a repo-name subpath.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
