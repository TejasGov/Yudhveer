import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { once } from 'node:events';
import http from 'node:http';
import https from 'node:https';
import { duelLoadoutId } from '../src/duel/Rules.ts';

/**
 * The Cloudflare relay's own gate and its timers on the Durable Object, over real sockets. Runs only with a relay:
 *   cd server && npm run dev        (cf dev: the Worker and DuelRoomObject in local workerd, http://localhost:5173)
 *   DUEL_RELAY_URL=ws://localhost:5173 node --experimental-vm-modules --test scripts/duel-*.test.mjs
 * The same file can check a deployed relay (wss://...); it opens a few short-lived rooms with random codes.
 */
const relay = process.env.DUEL_RELAY_URL;
const origin = process.env.DUEL_RELAY_ORIGIN ?? 'http://localhost:5173';
const skip = relay ? false : 'set DUEL_RELAY_URL to a running relay Worker';
const code = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), n => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n % 32]).join('');

const sockets = new Set();
test.afterEach(() => { for (const ws of sockets) ws.terminate(); sockets.clear(); });
function open(room, create, { ack = true, from = origin } = {}) {
  const ws = new WebSocket(relay + '/?room=' + room + '&create=' + (create ? 1 : 0), { origin: from });
  sockets.add(ws);
  const peer = { ws, messages: [], closed: new Promise(resolve => ws.on('close', (code, reason) => resolve({ code, reason: String(reason) }))) };
  ws.on('message', raw => {
    const m = JSON.parse(String(raw)); peer.messages.push(m);
    if (ack && m.delivery) ws.send(JSON.stringify({ type: 'ack', delivery: m.delivery }));
  });
  peer.next = type => new Promise((resolve, reject) => {
    const found = peer.messages.find(m => m.type === type); if (found) { resolve(found); return; }
    const timer = setTimeout(() => reject(new Error('No ' + type + ' message')), 8000);
    ws.on('message', raw => { const m = JSON.parse(String(raw)); if (m.type === type) { clearTimeout(timer); resolve(m); } });
  });
  return peer;
}
// An Upgrade header without a handshake: the Worker answers it like a refused upgrade, while a real refused handshake
// shows only as a dropped socket under the local dev server (and as onerror in a browser).
const refused = async (url, from) => {
  const request = (url.startsWith('wss') ? https : http).get(url.replace(/^ws/, 'http'), { headers: { Upgrade: 'websocket', ...from && { Origin: from } } });
  const [response] = await once(request, 'response'); response.resume(); return response.statusCode;
};
const pair = async options => {
  const room = code(), a = open(room, true); await a.next('joined');
  const b = open(room, false, options); await b.next('joined'); return { room, a, b };
};
const ready = (peer, round = 0) => peer.ws.send(JSON.stringify({ type: 'ready', round, loadout: duelLoadoutId(1) }));

test('worker gate: plain requests, unknown pages and bad room codes never reach a room', { skip }, async () => {
  assert.equal((await fetch(relay.replace(/^ws/, 'http') + '/?room=ABC123')).status, 426);
  assert.equal(await refused(relay + '/?room=ABC123&create=1', 'https://evil.example'), 403);
  assert.equal(await refused(relay + '/?room=ABC123&create=1', 'https://yudhveer.pages.dev.evil.example'), 403);
  assert.equal(await refused(relay + '/?room=ABC123&create=1'), 403);
  assert.equal(await refused(relay + '/?room=abc&create=1', origin), 400);
  assert.equal(await refused(relay + '/?create=1', origin), 400);
});

test('worker rooms: a missing room and a third player are refused', { skip }, async () => {
  const missing = open(code(), false);
  assert.equal((await missing.next('error')).message, 'Room not found'); assert.equal((await missing.closed).code, 1008);
  const { room, a, b } = await pair(), third = open(room, false);
  assert.equal((await third.next('error')).message, 'Room is full'); await third.closed;
  a.ws.close(); await b.closed;
});

test('worker rooms: an oversize message ends that connection and the peer is told', { skip }, async () => {
  const { a, b } = await pair();
  a.ws.send('x'.repeat(5000));
  assert.equal((await a.closed).code, 1009);
  await b.next('disconnected'); assert.equal((await b.closed).reason, 'Opponent disconnected');
});

test('worker rooms: delivery receipts stand in for bufferedAmount; a player who stops acknowledging is dropped', { skip }, async () => {
  const { a, b } = await pair({ ack: false });
  ready(a); ready(b); await a.next('start');
  const closed = await b.closed; assert.equal(closed.reason, 'Delivery stalled');
  await a.next('disconnected');
});

test('worker rooms: the two-second simulation stall check runs on the Durable Object clock', { skip }, async () => {
  const { a, b } = await pair();
  ready(a); ready(b); await a.next('card'); const start = await a.next('start'); const at = performance.now();
  assert.equal(start.roundNumber, 1);
  // Neither sends a snapshot. The room checks its seats in join order, so the creator is named and the peer told.
  assert.match((await a.next('error')).message, /simulation stalled/);
  const waited = performance.now() - at; assert.ok(waited >= 1900 && waited < 4000, 'stall after ' + waited + ' ms');
  await b.next('disconnected'); await Promise.all([a.closed, b.closed]);
});
