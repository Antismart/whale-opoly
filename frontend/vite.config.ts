import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  optimizeDeps: {
    include: ['@dojoengine/sdk', '@dojoengine/core', '@dojoengine/torii-client', '@dojoengine/torii-wasm'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    fs: {
      allow: ['..', '../..'],
    },
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      include: [/@dojoengine\/.*/, /node_modules/],
    },
  },
})
