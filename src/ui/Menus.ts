import type { MenuAction } from '../core/InputManager';
import { SoundFX } from '../combat/SoundFX';

/** Keyboard / gamepad / mouse focus for one menu: a container of buttons, navigated up and down. */
export class MenuNav {
  private index = 0;
  /** Left/right on the focused item (settings sliders). Return true if handled. */
  public onAdjust: ((button: HTMLButtonElement, dir: -1 | 1) => boolean) | null = null;

  constructor(public readonly root: HTMLElement) {
    root.addEventListener('mousemove', (e) => {
      const button = (e.target as HTMLElement).closest('button');
      if (button && !button.disabled && this.items().includes(button)) this.focus(this.items().indexOf(button), false);
    });
  }

  public items(): HTMLButtonElement[] {
    return [...this.root.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.hidden && b.offsetParent !== null);
  }

  /** Focuses the first enabled item (or `preferred`). */
  public reset(preferred?: HTMLButtonElement | null): void {
    const items = this.items();
    const start = preferred && !preferred.disabled && items.includes(preferred) ? items.indexOf(preferred) : items.findIndex((b) => !b.disabled);
    this.focus(Math.max(0, start), false);
  }

  public focus(i: number, sound = true): void {
    const items = this.items();
    if (items.length === 0) return;
    const next = ((i % items.length) + items.length) % items.length;
    if (sound && next !== this.index) SoundFX.getInstance().playUiMove();
    this.index = next;
    items.forEach((b, k) => b.classList.toggle('focused', k === next));
  }

  private step(dir: 1 | -1): void {
    const items = this.items();
    for (let k = 1; k <= items.length; k++) {
      const i = this.index + dir * k;
      const b = items[((i % items.length) + items.length) % items.length];
      if (!b.disabled) {
        this.focus(i);
        return;
      }
    }
  }

  /** Handles a navigation action; returns false for `back` so the owner can close the menu. */
  public handle(action: MenuAction): boolean {
    const items = this.items();
    const current = items[this.index];
    switch (action) {
      case 'up':
        this.step(-1);
        return true;
      case 'down':
        this.step(1);
        return true;
      case 'left':
      case 'right':
        return current ? !!this.onAdjust?.(current, action === 'left' ? -1 : 1) : false;
      case 'confirm':
        if (current && !current.disabled) current.click();
        return true;
      default:
        return false;
    }
  }
}

/**
 * The menu screens as a stack: the top one gets navigation, `back` pops to the one below. Screens are the
 * `<section class="screen">` elements of index.html; each one with a `.menu` gets a `MenuNav`.
 */
export class ScreenStack {
  private readonly stack: string[] = [];
  private readonly navs = new Map<string, MenuNav>();
  /** Called when `back` is pressed on a screen with nothing beneath it in the stack. */
  public onBackAtRoot: ((id: string) => void) | null = null;
  /** Called when a screen is removed from the top (popped or replaced). */
  public onClose: ((id: string) => void) | null = null;

  public nav(id: string): MenuNav {
    let nav = this.navs.get(id);
    if (!nav) {
      const root = document.getElementById(id)!;
      nav = new MenuNav(root);
      this.navs.set(id, nav);
    }
    return nav;
  }

  public get top(): string | undefined {
    return this.stack[this.stack.length - 1];
  }

  public isOpen(id: string): boolean {
    return this.stack.includes(id);
  }

  public get empty(): boolean {
    return this.stack.length === 0;
  }

  /** Opens `id` above the current screen (which stays drawn beneath it unless `exclusive`). */
  public push(id: string, preferred?: HTMLButtonElement | null): void {
    const below = this.top;
    if (below) document.getElementById(below)!.hidden = true;
    this.stack.push(id);
    document.getElementById(id)!.hidden = false;
    this.nav(id).reset(preferred);
  }

  public pop(): void {
    const id = this.stack.pop();
    if (!id) return;
    document.getElementById(id)!.hidden = true;
    this.onClose?.(id);
    const below = this.top;
    if (below) {
      document.getElementById(below)!.hidden = false;
      this.nav(below).focus(this.navIndexOf(below), false);
    }
  }

  /** Closes every screen. */
  public clear(): void {
    while (this.stack.length) {
      const id = this.stack.pop()!;
      document.getElementById(id)!.hidden = true;
      this.onClose?.(id);
    }
  }

  /** Replaces the whole stack with `id`. */
  public only(id: string, preferred?: HTMLButtonElement | null): void {
    this.clear();
    this.push(id, preferred);
  }

  private navIndexOf(id: string): number {
    const nav = this.nav(id);
    const items = nav.items();
    const i = items.findIndex((b) => b.classList.contains('focused'));
    return Math.max(0, i);
  }

  /** Routes a navigation action to the top screen. Returns whether a screen took it. */
  public handle(action: MenuAction): boolean {
    const id = this.top;
    if (!id) return false;
    if (this.nav(id).handle(action)) return true;
    if (action === 'back') {
      if (this.stack.length > 1) {
        SoundFX.getInstance().playUiMove();
        this.pop();
      } else this.onBackAtRoot?.(id);
      return true;
    }
    return action !== 'pause';
  }
}
