/// <reference types="vite/client" />

declare module '*.css';

/** Ids of the recorded lines in public/assets/voice (see vite.config.ts). */
declare module 'virtual:voice-lines' {
  const ids: string[];
  export default ids;
}

/** Ids of the recorded sound effects in public/assets/sfx (see vite.config.ts). */
declare module 'virtual:sfx-samples' {
  const ids: string[];
  export default ids;
}

/** Ids of the soundtrack's loops in public/assets/music (see vite.config.ts). */
declare module 'virtual:music-tracks' {
  const ids: string[];
  export default ids;
}

/** Content hashes of every file in public/assets, by its path in that folder (empty under `npm run dev`; see vite.config.ts and src/core/Assets.ts). */
declare module 'virtual:asset-versions' {
  const versions: Record<string, string>;
  export default versions;
}
