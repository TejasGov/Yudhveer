import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 5199,
    strictPort: true,
    host: true
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat']
  }
});
