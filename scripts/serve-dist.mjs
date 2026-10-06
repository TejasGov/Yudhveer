#!/usr/bin/env node
/**
 * A small static server for trying a production build the way a host will serve it, including from a sub-folder.
 *
 *   node scripts/serve-dist.mjs --dir dist --mount /Yudhveer/ --port 5253
 *
 * Only paths under `--mount` are served (default `/`): anything else is a 404, as it is on GitHub Pages (a project site
 * lives at /<repo>/ and the rest of the domain is not yours), so a request for `/assets/...` from a build that was meant
 * for a sub-path shows up as the 404 it would be. Every request is kept, and `GET <mount>__requests` returns them as
 * JSON (`?reset=1` empties the list), so a test can check that nothing was missed and that nothing asked for the wrong
 * place. `--gzip` compresses the text types as hosts do (GitHub Pages, Netlify and Cloudflare do not compress .glb).
 * No dependencies. docs/DEPLOY.md.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createGzip } from 'node:zlib';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const root = resolve(opt('--dir', 'dist'));
let mount = opt('--mount', '/');
if (!mount.startsWith('/')) mount = `/${mount}`;
if (!mount.endsWith('/')) mount += '/';
const port = Number(opt('--port', '5253'));
const gzip = args.includes('--gzip');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.mp3': 'audio/mpeg', '.hdr': 'application/octet-stream', '.exr': 'application/octet-stream', '.txt': 'text/plain',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.wasm']);

const requests = [];
createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const started = Date.now();
  const record = (status, bytes) => requests.push({ method: req.method, path: url.pathname + url.search, status, bytes, ms: Date.now() - started });
  const send = (status, body, headers = {}) => { res.writeHead(status, { 'cache-control': 'no-store', 'access-control-allow-origin': '*', ...headers }); res.end(body); record(status, Buffer.byteLength(body ?? '')); };

  if (url.pathname === `${mount}__requests`) {
    if (url.searchParams.has('reset')) requests.length = 0;
    return send(200, JSON.stringify(requests), { 'content-type': 'application/json' });
  }
  if (!url.pathname.startsWith(mount)) return send(404, `Not under ${mount}`, { 'content-type': 'text/plain' });
  let rel = decodeURIComponent(url.pathname.slice(mount.length)) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const file = normalize(join(root, rel));
  if (!file.startsWith(root + sep) && file !== root) return send(403, 'Forbidden', { 'content-type': 'text/plain' });
  if (!existsSync(file) || !statSync(file).isFile()) return send(404, 'Not found', { 'content-type': 'text/plain' });

  const ext = extname(file).toLowerCase();
  const headers = { 'content-type': TYPES[ext] ?? 'application/octet-stream', 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
  const size = statSync(file).size;
  if (req.method === 'HEAD') { res.writeHead(200, { ...headers, 'content-length': size }); res.end(); return record(200, 0); }
  const stream = createReadStream(file);
  if (gzip && COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
    res.writeHead(200, { ...headers, 'content-encoding': 'gzip', vary: 'accept-encoding' });
    let sent = 0;
    const z = createGzip({ level: 6 });
    z.on('data', (c) => { sent += c.length; });
    z.on('end', () => record(200, sent));
    stream.pipe(z).pipe(res);
  } else {
    res.writeHead(200, { ...headers, 'content-length': size });
    stream.pipe(res);
    res.on('close', () => record(200, size));
  }
}).listen(port, () => console.log(`serving ${root} at http://localhost:${port}${mount}${gzip ? ' (gzip)' : ''}`));
