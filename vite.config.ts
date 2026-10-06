import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

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

/**
 * `virtual:asset-versions`: a short hash of the bytes of every file in public/assets, by its path inside that folder
 * (`characters/yodha.glb`). `asset()` (src/core/Assets.ts) puts it on the URL as `?v=`: the build does not rename these
 * files the way it does the bundle's scripts, so the version is what lets a host cache `/assets/` for a year and still
 * serve a file that changed (see docs/DEPLOY.md). Empty under `npm run dev`, which serves the files as they are.
 */
function assetVersions(): Plugin {
  const module = 'virtual:asset-versions';
  const resolved = `\0${module}`;
  const root = resolve('public/assets');
  let serving = false;
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  return {
    name: 'asset-versions',
    configResolved: (config) => { serving = config.command === 'serve'; },
    resolveId: (id) => (id === module ? resolved : undefined),
    load(id) {
      if (id !== resolved) return undefined;
      const versions: Record<string, string> = {};
      if (!serving && existsSync(root)) {
        for (const file of walk(root).sort()) {
          versions[relative(root, file).split(sep).join('/')] = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 10);
        }
      }
      return `export default ${JSON.stringify(versions)};`;
    },
  };
}

export default defineConfig({
  // Where the build will be served from: `/` (a domain of its own, and `npm run dev`), `/Yudhveer/` (GitHub Pages),
  // `./` (anywhere: the itch.io zip). `vite build --base=/Yudhveer/` overrides it; so does YUDHVEER_BASE. Every file the
  // game asks for goes through `asset()` (src/core/Assets.ts), so the base is all there is to change. docs/DEPLOY.md.
  base: process.env.YUDHVEER_BASE || '/',
  plugins: [assetVersions(), recordings('voice-lines', 'voice'), recordings('sfx-samples', 'sfx'), recordings('music-tracks', 'music')],
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
