#!/usr/bin/env node
/**
 * Fails if the game asks for a file by an absolute path ("/assets/...", "/sky/..."): that works from the root of a domain
 * only, so a build served from a sub-folder (GitHub Pages at /Yudhveer/) or unpacked anywhere (itch.io) would 404. Files in
 * public/assets are named through `asset()` (src/core/Assets.ts). Run by `npm run build`. Comments are not looked at.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|css|html)$/.test(e.name)) files.push(p);
  }
})(join(root, 'src'));
files.push(join(root, 'index.html'));

// A quote or backtick straight before /assets/ (or any other top-level folder of public/), or css url(/...).
const topLevel = ['assets', 'characters', 'levels', 'weapons', 'sky', 'music', 'voice', 'sfx', 'dwarka'].join('|');
const absolute = new RegExp(`(['"\`]|url\\(\\s*)/(${topLevel})/`);
const problems = [];
for (const file of files) {
  let inBlock = false;
  readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    let code = line;
    if (inBlock) {
      const end = code.indexOf('*/');
      if (end < 0) return;
      inBlock = false;
      code = code.slice(end + 2);
    }
    // Drop block comments that open (and maybe close) on this line, then line comments that are not inside a string.
    code = code.replace(/\/\*.*?\*\//g, '');
    const open = code.indexOf('/*');
    if (open >= 0) { inBlock = true; code = code.slice(0, open); }
    code = code.replace(/(^|[^:'"`])\/\/.*$/, '$1');
    if (absolute.test(code)) problems.push(`${relative(root, file)}:${i + 1}: ${line.trim()}`);
  });
}
if (problems.length) {
  console.error(`Absolute asset URLs (use asset('...') from src/core/Assets.ts, see docs/DEPLOY.md):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-asset-urls: no absolute asset URLs in ${files.length} files`);
