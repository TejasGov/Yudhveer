import { defineConfig, type Plugin } from 'vite';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const VOICE_DIR = resolve('public/assets/voice');
const VOICE_MODULE = 'virtual:voice-lines';

/**
 * `virtual:voice-lines`: the ids of the recorded lines in public/assets/voice (`<id>.mp3`), read when the game is
 * built or served. The game only asks for files on this list, so a line whose recording does not exist yet never
 * shows a 404 in the console. Adding or removing a file while `npm run dev` runs reloads the page.
 */
function voiceLines(): Plugin {
  const resolved = `\0${VOICE_MODULE}`;
  return {
    name: 'voice-lines',
    resolveId: (id) => (id === VOICE_MODULE ? resolved : undefined),
    load(id) {
      if (id !== resolved) return undefined;
      const ids = existsSync(VOICE_DIR) ? readdirSync(VOICE_DIR).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : [];
      return `export default ${JSON.stringify(ids.sort())};`;
    },
    configureServer(server) {
      const changed = (file: string) => {
        if (!resolve(file).startsWith(VOICE_DIR) || !file.endsWith('.mp3')) return;
        const mod = server.moduleGraph.getModuleById(resolved);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', changed);
      server.watcher.on('unlink', changed);
    },
  };
}

export default defineConfig({
  plugins: [voiceLines()],
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
