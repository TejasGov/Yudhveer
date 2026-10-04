import type { InputDevice } from '../core/InputManager';

export type GlyphAction = 'attack' | 'guard' | 'jump' | 'dodge' | 'sprint' | 'charge' | 'stow' | 'pause' | 'skip' | 'confirm';

const KEYBOARD: Record<GlyphAction, string> = {
  attack: 'Left click',
  guard: 'Right click',
  jump: 'Space',
  dodge: 'F',
  sprint: 'Shift',
  charge: 'Q',
  stow: 'X',
  pause: 'Esc',
  skip: 'Space',
  confirm: 'Enter',
};

const GAMEPAD: Record<GlyphAction, string> = {
  attack: 'X',
  guard: 'LB',
  jump: 'A',
  dodge: 'B',
  sprint: 'L3',
  charge: 'Y',
  stow: 'D-pad down',
  pause: 'Start',
  skip: 'A',
  confirm: 'A',
};

/** The key or button for `action` on `device`, as a <kbd>. */
export function glyph(action: GlyphAction, device: InputDevice): string {
  return `<kbd>${(device === 'gamepad' ? GAMEPAD : KEYBOARD)[action]}</kbd>`;
}

/** Fills every `[data-glyph]` element under `root` for `device`. */
export function refreshGlyphs(root: ParentNode, device: InputDevice): void {
  root.querySelectorAll<HTMLElement>('[data-glyph]').forEach((el) => {
    el.innerHTML = glyph(el.dataset.glyph as GlyphAction, device);
  });
}

/** Replaces `{attack}`-style placeholders in a hint with glyphs. */
export function withGlyphs(text: string, device: InputDevice): string {
  return text.replace(/\{(\w+)\}/g, (_, a: string) => glyph(a as GlyphAction, device));
}
