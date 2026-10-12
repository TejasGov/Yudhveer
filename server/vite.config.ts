import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

// Builds only the duel relay Worker (server/); the game is the Vite project at the repository root.
export default defineConfig({ plugins: [cloudflare()] });
