/**
 * Cloud target for the shared relay: `cf deploy` from server/ (cloudflare.config.ts, docs/DEPLOY.md "Duel relay").
 * The Worker admits only WebSocket upgrades from allowed page origins with a valid room code; one DUEL_ROOMS Durable
 * Object per room code owns that room's two sockets in memory. The room stores nothing, so eviction loses nothing.
 * Standard accepted WebSockets, not hibernation: the room's timers and socket-keyed seats live in memory, and a fight
 * never idles long enough to hibernate. Idle lobbies close after DUEL_IDLE_MS instead (DuelRoom.watchIdle).
 * Workers sockets have no bufferedAmount: the room's delivery receipts bound its queue on its own.
 */
import { DurableObject } from 'cloudflare:workers';
import { DuelRoom, roomCode } from './DuelRoom.mjs';
const MAX_MESSAGE = 4096; // the Node relay's maxPayload; a real message is well under 2 KiB

/** ALLOWED_ORIGINS is comma separated; `*` matches one host label or a port, never a dot, colon or slash. */
export const originAllowed = (origin, list = '') => !!origin && list.split(',').map(p => p.trim()).some(p => p
  && new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^./:]+') + '$').test(origin));

export default {
  async fetch(request, env) {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required', { status: 426 });
    if (!originAllowed(request.headers.get('Origin'), env.ALLOWED_ORIGINS)) return new Response('Origin not allowed', { status: 403 });
    const code = new URL(request.url).searchParams.get('room');
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
    // A refused join (no such room, room full) has already sent its error and closed; it gets no listeners.
    if (this.room.join(server, url.searchParams.get('create') === '1')) {
      server.addEventListener('message', ({ data }) => {
        if (typeof data === 'string' && data.length <= MAX_MESSAGE) { this.room.message(server, data); return; }
        this.room.leave(server); server.close(1009, 'Message too big');
      });
      server.addEventListener('close', () => this.room.leave(server));
      server.addEventListener('error', () => this.room.leave(server));
    }
    return new Response(null, { status: 101, webSocket: client });
  }
}
