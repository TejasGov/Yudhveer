import { bindings, defineConfig, exports } from "cf/config";

/**
 * The online duel relay: `cf deploy` from this folder (docs/DEPLOY.md, "Duel relay"). One DuelRoomObject per room code.
 * Declaring the class as a live SQLite-backed export is what registers it (the cf form of a `new_sqlite_classes`
 * migration); the Workers Free plan only offers SQLite-backed Durable Objects. The room keeps no storage at all.
 */
const name = "yudhveer-duel";
export default defineConfig({
  worker: {
    name,
    compatibilityDate: "2026-10-01",
    entrypoint: "./duel-worker.mjs",
    env: {
      DUEL_ROOMS: bindings.durableObject({ worker: name, exportName: "DuelRoomObject" }),
      // Pages that may open a room: comma separated, `*` stands for one host label or a port.
      ALLOWED_ORIGINS: bindings.text("https://yudhveer.pages.dev,https://*.yudhveer.pages.dev,https://yudhveer.onrender.com,http://localhost:*,http://127.0.0.1:*"),
    },
    exports: { DuelRoomObject: exports.durableObject({ storage: "sqlite" }) },
    observability: { enabled: true },
  },
});
