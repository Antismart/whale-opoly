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
      // The published @dojoengine/torii-wasm@1.6.4 package is broken: its
      // entry point (pkg/web/dojo_c.js) was not included in the npm tarball.
      // This alias redirects all imports to a local no-op stub so Vite can
      // resolve the module. Remove this once the upstream package is fixed or
      // the Dojo SDK no longer requires torii-wasm as a separate package.
      '@dojoengine/torii-wasm': path.resolve(__dirname, 'src/torii-wasm-stub.ts'),
    },
  },
  optimizeDeps: {
    // Exclude the stubbed package from Vite's dependency pre-bundling since
    // it's aliased to a local file. Include the SDK packages that do need
    // pre-bundling for faster dev startup.
    exclude: ['@dojoengine/torii-wasm'],
    include: ['@dojoengine/sdk', '@dojoengine/core', '@dojoengine/torii-client'],
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
