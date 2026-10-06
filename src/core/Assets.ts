import versions from 'virtual:asset-versions';

/**
 * Where the game's files are served from. Vite's `base` is baked into the build as `import.meta.env.BASE_URL`: `/` for
 * `npm run dev` and a host that owns its whole domain, `/Yudhveer/` on GitHub Pages, `./` in the itch.io zip (see
 * docs/DEPLOY.md). A URL written out as "/assets/..." only works from the root of a domain, so nothing in the game asks
 * for a file by one: everything under `public/assets` is named through `asset()`.
 *
 * The files under `public/assets` are not renamed by the build the way the bundle's scripts are, so a build gives each
 * a `?v=<hash of its bytes>` (`virtual:asset-versions`, vite.config.ts): a host can then cache everything under
 * "/assets/" for a year (`public/_headers`) and a file that changes is fetched again, and only that one. `npm run dev`
 * serves the files as they are, with no version.
 */
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

/**
 * The URL of a file in `public/assets`, from its path inside that folder: `asset('characters/yodha.glb')`.
 * Relative to the page when the base is `./`, so it works wherever the build is unpacked.
 */
export function asset(path: string): string {
  const version = (versions as Record<string, string>)[path];
  return `${BASE}assets/${path}${version ? `?v=${version}` : ''}`;
}
