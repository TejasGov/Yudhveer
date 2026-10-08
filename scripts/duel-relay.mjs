/**
 * Local-only development WebSocket relay: npm run duel:relay. No cloud account or credentials are needed.
 * Every six-character code names the same shared room core the Durable Object uses. Empty rooms are removed,
 * payloads are bounded, and ws ping/pong detects a vanished peer even when TCP has not closed cleanly.
 */
import { WebSocketServer } from 'ws';
import { DuelRoom, roomCode } from '../server/DuelRoom.mjs';
const port = Number(process.env.DUEL_PORT ?? 8787);
const host = process.env.DUEL_HOST ?? '127.0.0.1';
const rooms = new Map();
const server = new WebSocketServer({ host, port, maxPayload: 4096 });
server.on('connection', (socket, request) => {
  const url = new URL(request.url, 'http://localhost');
  const code = url.searchParams.get('room');
  if (!roomCode(code)) { socket.close(1008, 'Invalid room code'); return; }
  const room = rooms.get(code) ?? new DuelRoom(code);
  if (!room.join(socket, url.searchParams.get('create') === '1')) return;
  rooms.set(code, room);
  socket.alive = true;
  socket.on('pong', () => { socket.alive = true; });
  socket.on('message', (data, binary) => { if (!binary) room.message(socket, data.toString()); });
  const leave = () => { room.leave(socket); if (!room.seats.size) rooms.delete(code); };
  socket.on('close', leave); socket.on('error', leave);
});
const heartbeat = setInterval(() => {
  for (const socket of server.clients) {
    if (!socket.alive) { socket.terminate(); continue; }
    socket.alive = false; socket.ping();
  }
}, 10000);
server.on('close', () => clearInterval(heartbeat));
server.on('listening', () => console.log('Duel relay listening on ws://' + host + ':' + port));
