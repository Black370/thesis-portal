import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This tells Vite to prepend '/thesis-portal/' to all your asset links
  base: '/thesis-portal/',
})