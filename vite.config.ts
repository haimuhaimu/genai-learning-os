import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  base: isGitHubPagesBuild ? '/genai-learning-os/' : '/',
  plugins: [react()],
  build: {
    manifest: true,
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(?:react|react-dom|scheduler)\//.test(id)) return 'react'
          if (id.includes('/node_modules/recharts/')) return 'recharts'
          if (id.includes('/node_modules/lucide-react/')) return 'icons'
        },
      },
    },
  },
})
