#!/usr/bin/env node
/**
 * Repacks the animations of a Blender-exported, meshopt-compressed GLB without changing a single value in it.
 *
 * Blender writes one accessor and one buffer view for every keyframe track of every clip (a hero with 86 clips has 6,600 of
 * each), and a buffer view's JSON is some 200 bytes: the JSON chunk of the hero is 2.6 MB of his 8.6 MB, the Vetala's 1.7 of 4.0,
 * and every byte of it is read before a frame can be drawn. This tool
 *
 *   - decodes each animation buffer view down to the bytes the meshopt filters were fed (not the filtered output, so nothing
 *     is quantised twice), drops the tracks that are byte for byte the same as another (a time array shared by a whole clip, a
 *     held pose), and joins the rest, by kind (time, rotation, translation, scale), into one buffer view each, encoded again
 *     (the meshopt vertex codec is lossless);
 *   - gives every accessor its place in those views (a byteOffset), merges accessors that came out identical, merges samplers
 *     that came out identical, and leaves out the `interpolation` that says LINEAR (the default).
 *
 * Meshes, skins, nodes, materials and images are copied as they were (the same bytes). The result decodes to the same
 * numbers: `--check` proves it (every animation channel's times and values, every attribute of every mesh, and the rest of the
 * JSON, compared against the file it came from). Running it on its own output changes nothing.
 *
 *   node scripts/pack-glb.mjs public/assets/characters/yodha.glb [more.glb ...]
 *       --out <dir>    write into this folder instead of over the file
 *       --v0           write the attribute streams in meshopt codec version 0 (the default is version 1, ~8 % smaller; three reads both)
 *       --keep-codec   leave every stream that is not joined as it is
 *       --backup <dir> copy each file there before it is overwritten (public/assets is in git: not needed there)
 *       --dry          report what would change, write nothing
 *       --check        compare every result with its source (always done: this only prints the details)
 *
 * Uses only `meshoptimizer` (in node_modules, with three's types). docs/DEPLOY.md, game asset/README.md.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { MeshoptEncoder } from 'meshoptimizer/encoder';

const COMPONENT_BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const TYPE_COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const TYPED = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const align = (n, to) => (n + to - 1) & ~(to - 1);

export function readGLB(file) {
  return parseGLB(readFileSync(file), file);
}

export function parseGLB(data, name = 'GLB') {
  if (data.readUInt32LE(0) !== 0x46546c67) throw new Error(`${name}: not a GLB`);
  const jsonLength = data.readUInt32LE(12);
  const doc = JSON.parse(data.subarray(20, 20 + jsonLength).toString('utf8'));
  const binLength = data.length > 28 + jsonLength ? data.readUInt32LE(20 + jsonLength) : 0;
  const bin = data.subarray(28 + jsonLength, 28 + jsonLength + binLength);
  return { data, doc, bin, jsonLength, binLength };
}

export function writeGLB(doc, bin) {
  const json = Buffer.from(JSON.stringify(doc), 'utf8');
  const jsonPad = Buffer.alloc(align(json.length, 4) - json.length, 0x20);
  const binPad = Buffer.alloc(align(bin.length, 4) - bin.length, 0);
  const jsonChunk = Buffer.concat([json, jsonPad]);
  const binChunk = Buffer.concat([bin, binPad]);
  const total = 12 + 8 + jsonChunk.length + (binChunk.length ? 8 + binChunk.length : 0);
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonChunk.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const parts = [head, jh, jsonChunk];
  if (binChunk.length) {
    const bh = Buffer.alloc(8); bh.writeUInt32LE(binChunk.length, 0); bh.writeUInt32LE(0x004e4942, 4);
    parts.push(bh, binChunk);
  }
  return Buffer.concat(parts);
}

const ext = (view) => view.extensions?.EXT_meshopt_compression;
const elementBytes = (acc) => COMPONENT_BYTES[acc.componentType] * TYPE_COUNT[acc.type];

/** The bytes of a buffer view as the stream holds them, filter not applied (what the encoder is given back). */
function viewBytes(doc, bin, index, applyFilter) {
  const v = doc.bufferViews[index];
  const e = ext(v);
  if (!e) return Uint8Array.from(bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength));
  const source = new Uint8Array(bin.buffer, bin.byteOffset + (e.byteOffset ?? 0), e.byteLength);
  const target = new Uint8Array(e.count * e.byteStride);
  if (e.mode === 'ATTRIBUTES') MeshoptDecoder.decodeVertexBuffer(target, e.count, e.byteStride, source, applyFilter ? e.filter : undefined);
  else if (e.mode === 'TRIANGLES') MeshoptDecoder.decodeIndexBuffer(target, e.count, e.byteStride, source);
  else if (e.mode === 'INDICES') MeshoptDecoder.decodeIndexSequence(target, e.count, e.byteStride, source);
  else throw new Error(`unknown meshopt mode ${e.mode}`);
  return target;
}

/** An accessor's numbers as typed array (filters applied), the way a loader would read them. */
function readAccessor(doc, bin, index) {
  const acc = doc.accessors[index];
  const view = doc.bufferViews[acc.bufferView];
  const bytes = viewBytes(doc, bin, acc.bufferView, true);
  const n = acc.count * TYPE_COUNT[acc.type];
  const stride = ext(view)?.byteStride ?? view.byteStride ?? elementBytes(acc);
  const base = acc.byteOffset ?? 0; // (viewBytes starts at the view's own first byte, compressed or not)
  const T = TYPED[acc.componentType];
  const out = new T(n);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const comps = TYPE_COUNT[acc.type];
  const size = COMPONENT_BYTES[acc.componentType];
  const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[acc.componentType];
  for (let i = 0; i < acc.count; i++) for (let c = 0; c < comps; c++) out[i * comps + c] = dv[get](base + i * stride + c * size, true);
  return out;
}

const same = (a, b) => a.length === b.length && Buffer.compare(Buffer.from(a.buffer, a.byteOffset, a.byteLength), Buffer.from(b.buffer, b.byteOffset, b.byteLength)) === 0;

/**
 * Repacks `doc`/`bin`. Returns { doc, bin, report }.
 * `options.version`: the meshopt vertex codec version every attribute stream is written in (1 is about 8 % smaller than 0 and
 * three's bundled decoder reads both; null keeps each stream as it is).
 */
export async function repack(doc0, bin0, options = {}) {
  const targetVersion = options.version === undefined ? 1 : options.version;
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  const doc = structuredClone(doc0);
  const report = { views: doc.bufferViews.length, accessors: doc.accessors.length, channels: 0, samplers: 0, streamsBefore: 0, streamsAfter: 0, note: [] };
  if (!doc.extensionsUsed?.includes('EXT_meshopt_compression')) {
    report.note.push('nothing to repack (no meshopt streams)');
    return { doc: doc0, bin: bin0, report, changed: false };
  }

  // 1. The accessors the animations use, and what they are made of.
  const animAcc = new Set();
  for (const a of doc.animations ?? []) for (const s of a.samplers) { animAcc.add(s.input); animAcc.add(s.output); }
  const otherAcc = new Set();
  doc.meshes?.forEach((m) => m.primitives.forEach((p) => {
    Object.values(p.attributes).forEach((i) => otherAcc.add(i));
    if (p.indices !== undefined) otherAcc.add(p.indices);
    p.targets?.forEach((t) => Object.values(t).forEach((i) => otherAcc.add(i)));
  }));
  doc.skins?.forEach((s) => s.inverseBindMatrices !== undefined && otherAcc.add(s.inverseBindMatrices));
  for (const i of animAcc) if (otherAcc.has(i)) throw new Error(`accessor ${i} is used by an animation and by something else`);

  // A view is joinable if it is a meshopt ATTRIBUTES view that holds exactly one accessor's elements and nothing else uses it.
  const viewUsers = new Map();
  doc.accessors.forEach((a, i) => { if (a.bufferView !== undefined) (viewUsers.get(a.bufferView) ?? viewUsers.set(a.bufferView, new Set()).get(a.bufferView)).add(i); });
  const joinable = (i) => {
    const a = doc.accessors[i];
    const v = doc.bufferViews[a.bufferView];
    const e = ext(v);
    if (!e || e.mode !== 'ATTRIBUTES' || a.sparse || (a.byteOffset ?? 0) !== 0) return false;
    if (e.count !== a.count || e.byteStride !== elementBytes(a)) return false;
    return [...viewUsers.get(a.bufferView)].every((u) => animAcc.has(u));
  };

  // 2. Decode, name by content, group by kind.
  const canon = new Map(); // content key -> { group, offset (elements), count }
  const groups = new Map(); // group key -> { filter, stride, chunks: Uint8Array[], elements }
  const newAccessors = []; // JSON, deduplicated
  const accessorKey = new Map();
  const accessorMap = new Map(); // old accessor index -> new accessor index (into the animation list)
  let version = 0;
  for (const i of [...animAcc].sort((a, b) => a - b)) {
    const a = doc.accessors[i];
    if (!joinable(i)) { accessorMap.set(i, { keep: true }); continue; }
    const v = doc.bufferViews[a.bufferView];
    const e = ext(v);
    const stream = new Uint8Array(bin0.buffer, bin0.byteOffset + (e.byteOffset ?? 0), e.byteLength);
    version = stream[0] & 0x0f;
    const raw = viewBytes(doc, bin0, a.bufferView, false);
    const groupKey = `${e.filter ?? 'NONE'}/${e.byteStride}`;
    const contentKey = `${groupKey}/${a.count}/${createHash('sha1').update(raw).digest('hex')}`;
    let c = canon.get(contentKey);
    if (!c) {
      let g = groups.get(groupKey);
      if (!g) groups.set(groupKey, g = { key: groupKey, filter: e.filter, stride: e.byteStride, chunks: [], elements: 0 });
      c = { group: g, offset: g.elements, count: a.count };
      g.chunks.push(raw);
      g.elements += a.count;
      canon.set(contentKey, c);
    }
    const acc = { ...a, bufferView: c.group.key, byteOffset: c.offset * c.group.stride };
    if (!acc.byteOffset) delete acc.byteOffset;
    const key = JSON.stringify(acc);
    let n = accessorKey.get(key);
    if (n === undefined) { n = newAccessors.length; newAccessors.push(acc); accessorKey.set(key, n); }
    accessorMap.set(i, { index: n });
  }

  // 3. The new buffer views: everything that was not joined, as it was; then one per group.
  const joined = new Set();
  for (const i of animAcc) if (accessorMap.get(i)?.index !== undefined) joined.add(doc.accessors[i].bufferView);
  const views = [];
  const viewMap = new Map(); // old view index -> new
  doc.bufferViews.forEach((v, i) => {
    if (joined.has(i)) return;
    viewMap.set(i, views.length);
    views.push({ old: i, json: structuredClone(v) });
  });
  const groupViews = new Map();
  for (const g of groups.values()) {
    const all = new Uint8Array(g.elements * g.stride);
    let at = 0;
    for (const c of g.chunks) { all.set(c, at); at += c.length; }
    const encoded = MeshoptEncoder.encodeVertexBufferLevel(all, g.elements, g.stride, 3, targetVersion ?? version);
    groupViews.set(g.key, views.length);
    views.push({
      group: g,
      encoded,
      json: { buffer: 1, byteLength: all.length, byteOffset: 0, extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: 0, byteLength: encoded.length, byteStride: g.stride, count: g.elements, mode: 'ATTRIBUTES', ...(g.filter ? { filter: g.filter } : {}) } } },
    });
  }

  // 4. The binary chunk and the fallback buffer's layout, rebuilt in order (16-byte aligned, as Blender wrote it).
  const parts = [];
  let binAt = 0;
  let fallbackAt = 0;
  for (const v of views) {
    let bytes;
    if (v.encoded) bytes = v.encoded;
    else {
      const e = ext(v.json);
      const start = (e ? e.byteOffset ?? 0 : v.json.byteOffset ?? 0);
      const length = e ? e.byteLength : v.json.byteLength;
      bytes = bin0.subarray(start, start + length);
      if (e) report.streamsBefore += length;
      // An attribute stream written again in the wanted codec version (kept as it was if that is not smaller).
      if (e?.mode === 'ATTRIBUTES' && targetVersion !== null && (bytes[0] & 0x0f) !== targetVersion) {
        const again = MeshoptEncoder.encodeVertexBufferLevel(viewBytes(doc0, bin0, v.old, false), e.count, e.byteStride, 3, targetVersion);
        if (again.length < bytes.length) bytes = again;
      }
    }
    if (v.encoded) report.streamsAfter += v.encoded.length;
    else if (ext(v.json)) report.streamsAfter += bytes.length;
    binAt = align(binAt, 16);
    parts.push([binAt, bytes]);
    const e = ext(v.json);
    if (e) {
      e.byteOffset = binAt;
      e.byteLength = bytes.length;
      fallbackAt = align(fallbackAt, 4);
      v.json.byteOffset = fallbackAt;
      fallbackAt += v.json.byteLength;
    } else {
      v.json.byteOffset = binAt;
    }
    binAt += bytes.length;
  }
  const bin = Buffer.alloc(align(binAt, 4));
  for (const [at, bytes] of parts) Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).copy(bin, at);
  doc.bufferViews = views.map((v) => v.json);
  doc.buffers = doc.buffers.map((b, i) => (i === 0 ? { ...b, byteLength: bin.length } : { ...b, byteLength: align(fallbackAt, 4) }));

  // 5. The accessors: those that are not the animations', in order; then the joined ones, which the animations refer to.
  const accessors = [];
  const accessorOut = new Map(); // old index -> new index
  doc.accessors.forEach((a, i) => {
    if (animAcc.has(i) && accessorMap.get(i)?.index !== undefined) return;
    accessorOut.set(i, accessors.length);
    accessors.push({ ...a, ...(a.bufferView !== undefined ? { bufferView: viewMap.get(a.bufferView) } : {}) });
  });
  const joinedBase = accessors.length;
  for (const a of newAccessors) accessors.push({ ...a, bufferView: groupViews.get(a.bufferView) });
  const accessorNew = (i) => (accessorMap.get(i)?.index !== undefined ? joinedBase + accessorMap.get(i).index : accessorOut.get(i));
  doc.accessors = accessors;
  doc.meshes?.forEach((m) => m.primitives.forEach((p) => {
    for (const k of Object.keys(p.attributes)) p.attributes[k] = accessorNew(p.attributes[k]);
    if (p.indices !== undefined) p.indices = accessorNew(p.indices);
    p.targets?.forEach((t) => { for (const k of Object.keys(t)) t[k] = accessorNew(t[k]); });
  }));
  doc.skins?.forEach((s) => { if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = accessorNew(s.inverseBindMatrices); });
  for (const img of doc.images ?? []) if (img.bufferView !== undefined) img.bufferView = viewMap.get(img.bufferView);

  // 6. Samplers: the same pair once, and the default interpolation left unsaid.
  for (const a of doc.animations ?? []) {
    report.channels += a.channels.length;
    const seen = new Map();
    const samplers = [];
    const remap = a.samplers.map((s) => {
      const out = { input: accessorNew(s.input), output: accessorNew(s.output) };
      if (s.interpolation && s.interpolation !== 'LINEAR') out.interpolation = s.interpolation;
      const key = JSON.stringify(out);
      let n = seen.get(key);
      if (n === undefined) { n = samplers.length; samplers.push(out); seen.set(key, n); }
      return n;
    });
    a.channels.forEach((c) => { c.sampler = remap[c.sampler]; });
    a.samplers = samplers;
    report.samplers += samplers.length;
  }
  report.viewsAfter = doc.bufferViews.length;
  report.accessorsAfter = doc.accessors.length;
  return { doc, bin, report, changed: true };
}

/** Everything the file says, in a form two files can be compared by: tracks by node name, attributes by values, the rest as JSON. */
function describe(doc, bin) {
  const out = { rest: null, tracks: new Map(), attributes: new Map() };
  const name = (i) => doc.nodes[i].name ?? `#${i}`;
  for (const a of doc.animations ?? []) {
    for (const c of a.channels) {
      const s = a.samplers[c.sampler];
      const key = `${a.name}|${name(c.target.node)}|${c.target.path}`;
      out.tracks.set(key, { interpolation: s.interpolation ?? 'LINEAR', times: readAccessor(doc, bin, s.input), values: readAccessor(doc, bin, s.output), outAcc: doc.accessors[s.output], inAcc: doc.accessors[s.input] });
    }
  }
  doc.meshes?.forEach((m, mi) => m.primitives.forEach((p, pi) => {
    for (const [k, i] of Object.entries(p.attributes)) out.attributes.set(`${mi}.${pi}.${k}`, readAccessor(doc, bin, i));
    if (p.indices !== undefined) out.attributes.set(`${mi}.${pi}.indices`, readAccessor(doc, bin, p.indices));
    p.targets?.forEach((t, ti) => { for (const [k, i] of Object.entries(t)) out.attributes.set(`${mi}.${pi}.target${ti}.${k}`, readAccessor(doc, bin, i)); });
  }));
  doc.skins?.forEach((s, si) => { if (s.inverseBindMatrices !== undefined) out.attributes.set(`skin${si}.ibm`, readAccessor(doc, bin, s.inverseBindMatrices)); });
  (doc.images ?? []).forEach((img, i) => { if (img.bufferView !== undefined) out.attributes.set(`image${i}`, new Uint8Array(viewBytes(doc, bin, img.bufferView))); });
  const rest = structuredClone(doc);
  for (const k of ['bufferViews', 'accessors', 'buffers', 'animations']) delete rest[k];
  rest.meshes?.forEach((m) => m.primitives.forEach((p) => { delete p.attributes; delete p.indices; delete p.targets; }));
  rest.skins?.forEach((s) => { delete s.inverseBindMatrices; });
  rest.images?.forEach((img) => { delete img.bufferView; });
  out.rest = JSON.stringify(rest);
  out.animationNames = (doc.animations ?? []).map((a) => `${a.name}:${a.channels.length}`);
  return out;
}

/** Throws unless the two files hold the same animation tracks, mesh attributes, images and (apart from how they are stored) JSON. */
export async function check(docA, binA, docB, binB) {
  await MeshoptDecoder.ready;
  const a = describe(docA, binA);
  const b = describe(docB, binB);
  const problems = [];
  if (a.rest !== b.rest) problems.push('the JSON outside buffers, accessors and animations differs');
  if (a.animationNames.join() !== b.animationNames.join()) problems.push('clip names or channel counts differ');
  if (a.tracks.size !== b.tracks.size) problems.push(`track count ${a.tracks.size} vs ${b.tracks.size}`);
  let tracks = 0;
  for (const [k, t] of a.tracks) {
    const u = b.tracks.get(k);
    if (!u) { problems.push(`track ${k} missing`); continue; }
    tracks++;
    if (t.interpolation !== u.interpolation) problems.push(`track ${k}: interpolation`);
    if (!same(t.times, u.times)) problems.push(`track ${k}: times`);
    if (!same(t.values, u.values)) problems.push(`track ${k}: values`);
    if (t.outAcc.componentType !== u.outAcc.componentType || t.outAcc.type !== u.outAcc.type || !!t.outAcc.normalized !== !!u.outAcc.normalized) problems.push(`track ${k}: accessor type`);
    if (JSON.stringify(t.inAcc.min) !== JSON.stringify(u.inAcc.min) || JSON.stringify(t.inAcc.max) !== JSON.stringify(u.inAcc.max)) problems.push(`track ${k}: time range`);
  }
  let attrs = 0;
  for (const [k, v] of a.attributes) {
    const w = b.attributes.get(k);
    attrs++;
    if (!w || !same(v, w)) problems.push(`attribute ${k} differs`);
  }
  if (a.attributes.size !== b.attributes.size) problems.push('attribute count differs');
  return { problems, tracks, attrs };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); if (i < 0) return null; const [, v] = args.splice(i, 2); return v; };
  const flag = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
  const outDir = opt('--out');
  const backupDir = opt('--backup');
  const dry = flag('--dry');
  const verbose = flag('--check');
  const keepCodec = flag('--keep-codec');
  const version = keepCodec ? null : flag('--v0') ? 0 : 1;
  if (!args.length) { console.error('usage: node scripts/pack-glb.mjs file.glb [more.glb ...] [--out dir] [--backup dir] [--dry] [--check]'); process.exit(2); }
  let before = 0;
  let after = 0;
  for (const file of args) {
    const { data, doc, bin, jsonLength } = readGLB(file);
    const { doc: doc2, bin: bin2, report, changed } = await repack(doc, bin, { version });
    if (!changed) { console.log(`${basename(file)}: ${report.note.join(', ')}`); before += data.length; after += data.length; continue; }
    const out = writeGLB(doc2, bin2);
    const written = parseGLB(out);
    const verdict = await check(doc, bin, written.doc, written.bin);
    if (verdict.problems.length) {
      console.error(`${basename(file)}: NOT written, the result differs from the source:\n  ${verdict.problems.slice(0, 12).join('\n  ')}`);
      process.exitCode = 1;
      continue;
    }
    const jsonAfter = written.jsonLength;
    console.log(`${basename(file)}: ${(data.length / 1e6).toFixed(2)} MB -> ${(out.length / 1e6).toFixed(2)} MB  (json ${(jsonLength / 1024).toFixed(0)} KB -> ${(jsonAfter / 1024).toFixed(0)} KB; meshopt streams ${(report.streamsBefore / 1024).toFixed(0)} KB -> ${(report.streamsAfter / 1024).toFixed(0)} KB; buffer views ${report.views} -> ${report.viewsAfter}, accessors ${report.accessors} -> ${report.accessorsAfter}; ${verdict.tracks} tracks and ${verdict.attrs} arrays identical)`);
    before += data.length; after += out.length;
    if (verbose) console.log(`   channels ${report.channels}`);
    if (dry || out.length >= data.length) { if (!dry) console.log('   (not smaller: left as it was)'); continue; }
    const target = outDir ? join(resolve(outDir), basename(file)) : file;
    if (outDir) mkdirSync(resolve(outDir), { recursive: true });
    if (backupDir && !outDir) { mkdirSync(resolve(backupDir), { recursive: true }); if (!existsSync(join(resolve(backupDir), basename(file)))) copyFileSync(file, join(resolve(backupDir), basename(file))); }
    writeFileSync(target, out);
  }
  if (args.length > 1) console.log(`total ${(before / 1e6).toFixed(2)} MB -> ${(after / 1e6).toFixed(2)} MB`);
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
