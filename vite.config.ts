import { defineConfig, type Plugin } from 'vite';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A virtual module listing the recordings in a folder of public/assets (`<id>.mp3`), read when the game is built or
 * served. The game only asks for files on these lists, so a sound whose recording does not exist yet never shows a
 * 404 in the console (it falls back to its synthesized version, or to silence). Adding or removing a file while
 * `npm run dev` runs reloads the page.
 *
 * - `virtual:voice-lines`: recorded dialogue, public/assets/voice.
 * - `virtual:sfx-samples`: recorded sound effects, public/assets/sfx.
 * - `virtual:music-tracks`: the soundtrack's loops, public/assets/music.
 */
function recordings(name: string, folder: string): Plugin {
  const dir = resolve('public/assets', folder);
  const module = `virtual:${name}`;
  const resolved = `\0${module}`;
  return {
    name,
    resolveId: (id) => (id === module ? resolved : undefined),
    load(id) {
      if (id !== resolved) return undefined;
      const ids = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)) : [];
      return `export default ${JSON.stringify(ids.sort())};`;
    },
    configureServer(server) {
      const changed = (file: string) => {
        if (!resolve(file).startsWith(dir) || !file.endsWith('.mp3')) return;
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
  plugins: [recordings('voice-lines', 'voice'), recordings('sfx-samples', 'sfx'), recordings('music-tracks', 'music')],
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
