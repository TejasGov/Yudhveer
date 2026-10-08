/**
 * Cloud target for the same Stage 1 relay. One DUEL_ROOMS Durable Object per room code owns the two sockets.
 * This source is intentionally undeployed: bind DUEL_ROOMS to DuelRoomObject and register its initial migration
 * with the cf CLI only after deployment is requested. No Wrangler file or account resources are created here.
 * Standard accepted WebSockets keep the room in memory during a match; hibernation is a later hosting decision.
 */
import { DurableObject } from 'cloudflare:workers';
import { DuelRoom, roomCode } from './DuelRoom.mjs';
export default {
  async fetch(request, env) {
    const code = new URL(request.url).searchParams.get('room');
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
    if (!roomCode(code)) return new Response('Invalid room code', { status: 400 });
    return env.DUEL_ROOMS.get(env.DUEL_ROOMS.idFromName(code)).fetch(request);
  },
};
export class DuelRoomObject extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    this.room ??= new DuelRoom(url.searchParams.get('room'));
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    this.room.join(server, url.searchParams.get('create') === '1');
    server.addEventListener('message', event => this.room.message(server, event.data));
    server.addEventListener('close', () => this.room.leave(server));
    server.addEventListener('error', () => this.room.leave(server));
    return new Response(null, { status: 101, webSocket: client });
  }
}
