import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5199,
    strictPort: true,
    host: true,
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
  build: {
    // Rapier (compat build) ships its WebAssembly inlined as base64: ~4.3 MB, 1.7 MB gzipped, by design.
    chunkSizeWarningLimit: 4500,
    rolldownOptions: {
      output: {
        // Libraries in their own long-cached files, so a game update only re-downloads the game code.
        codeSplitting: {
          groups: [
            { name: 'rapier', test: /node_modules[\\/]@dimforge/ },
            { name: 'three', test: /node_modules[\\/](three|three-mesh-bvh)[\\/]/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
});
