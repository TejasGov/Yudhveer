/// <reference types="vite/client" />

declare module '*.css';

/** Ids of the recorded lines in public/assets/voice (see vite.config.ts). */
declare module 'virtual:voice-lines' {
  const ids: string[];
  export default ids;
}
