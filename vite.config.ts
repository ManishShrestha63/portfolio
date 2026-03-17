import { defineConfig } from 'vite'

export default defineConfig({
  base: '/portfolio/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
