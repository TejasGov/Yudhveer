#!/usr/bin/env node
/**
 * Builds the game for itch.io's HTML5 hosting and zips it: `yudhveer-itch.zip`, index.html at the top of the zip (what itch.io
 * asks for), every URL relative (`--base=./`), so it works whatever address itch.io puts the game on.
 *
 *   npm run build:itch            (or: node scripts/pack-itch.mjs [--no-build])
 *
 * The build goes to dist-itch/ (not dist/, which stays the default build). The zip is written with no dependencies: files
 * that are already compressed (.glb, .webp, .jpg, .mp3) are stored, the rest deflated, so itch.io's own zip checks pass
 * (index.html at the root, under 1000 files, under 1 GB). Public/_headers is left out (itch.io ignores it). docs/DEPLOY.md.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const root = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const out = join(root, 'dist-itch');
const zipFile = join(root, 'yudhveer-itch.zip');

if (!process.argv.includes('--no-build')) {
  const run = (cmd, args) => {
    const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && cmd !== process.execPath });
    if (r.status !== 0) process.exit(r.status ?? 1);
  };
  run(process.execPath, [join(root, 'scripts', 'check-asset-urls.mjs')]);
  run('npx', ['tsc']);
  const vite = join(dirname(createRequire(import.meta.url).resolve('vite/package.json')), 'bin', 'vite.js');
  rmSync(out, { recursive: true, force: true });
  run(process.execPath, [vite, 'build', '--base=./', '--outDir', out, '--emptyOutDir']);
}

const STORED = new Set(['.glb', '.webp', '.jpg', '.jpeg', '.png', '.mp3']);
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name !== '_headers') files.push(p);
  }
})(out);
files.sort();
if (!files.some((f) => relative(out, f) === 'index.html')) throw new Error('dist-itch/index.html is missing');
if (files.length > 1000) console.warn(`warning: ${files.length} files; itch.io allows 1000`);

// A fixed timestamp (2026-01-01 00:00) so the same build is the same zip.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
const chunks = [];
const central = [];
let offset = 0;
for (const file of files) {
  const name = Buffer.from(relative(out, file).split(sep).join('/'), 'utf8');
  const data = readFileSync(file);
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  const stored = STORED.has(ext) || data.length < 64;
  const body = stored ? data : deflateRawSync(data, { level: 6 });
  const crc = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
  local.writeUInt16LE(stored ? 0 : 8, 8); local.writeUInt16LE(DOS_TIME, 10); local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
  chunks.push(local, name, body);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8);
  entry.writeUInt16LE(stored ? 0 : 8, 10); entry.writeUInt16LE(DOS_TIME, 12); entry.writeUInt16LE(DOS_DATE, 14);
  entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(body.length, 20); entry.writeUInt32LE(data.length, 24);
  entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
  central.push(entry, name);
  offset += local.length + name.length + body.length;
}
const centralBytes = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBytes.length, 12); end.writeUInt32LE(offset, 16);
mkdirSync(dirname(zipFile), { recursive: true });
writeFileSync(zipFile, Buffer.concat([...chunks, centralBytes, end]));
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`yudhveer-itch.zip: ${files.length} files, ${mb(statSync(zipFile).size)} MB (${mb(files.reduce((s, f) => s + statSync(f).size, 0))} MB unpacked)`);
console.log('Upload it as an HTML project on itch.io ("This file will be played in the browser"); a 1280 x 720 viewport and the fullscreen button suit it.');
