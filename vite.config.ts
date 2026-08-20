import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true'

export default defineConfig({
  base: isGitHubPagesBuild ? '/genai-learning-os/' : '/',
  plugins: [react()],
})
