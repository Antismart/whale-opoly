import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      '@dojoengine/torii-wasm': path.resolve(__dirname, './src/torii-wasm-stub.ts')
    }
  },
  optimizeDeps: {
    exclude: ['@dojoengine/torii-wasm'],
    include: ['@dojoengine/sdk', '@dojoengine/core', '@dojoengine/torii-client'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  server: {
    fs: {
      allow: ['..', '../..']
    }
  },
  build: {
    target: 'esnext',
    commonjsOptions: {
      include: [/@dojoengine\/.*/, /node_modules/]
    }
  }
})
