import { Settings } from './Settings';

export interface InputState {
  /** Movement, screen-relative: x right, y forward, length 0..1 (a gamepad stick gives partial values). */
  moveX: number;
  moveY: number;
  sprint: boolean;
  /** Walk instead of run (C toggles it; a lightly pushed stick walks too). */
  walk: boolean;
  /** An unused attack press within the buffer window; the controller `consume`s it when it acts on it. */
  attack: boolean;
  /** Guard button held. */
  parry: boolean;
  /** Fresh, unused presses within the buffer window. */
  parryPressed: boolean;
  jump: boolean;
  /** The slide (an evasion). */
  dodge: boolean;
  stow: boolean;
  chargePressed: boolean;
  /** Charge button held. */
  charge: boolean;
}

/** Buffered one-shot presses. */
export type PressAction = 'attack' | 'parry' | 'jump' | 'dodge' | 'stow' | 'charge';
/** Menu navigation from either device. */
export type MenuAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause';
export type InputDevice = 'keyboard' | 'gamepad';

const PRESS_KEYS: Record<string, PressAction> = { Space: 'jump', KeyF: 'dodge', KeyX: 'stow', KeyQ: 'charge' };
/** How long an early press stays usable, in gameplay seconds (hit-stop slows it with everything else). */
const BUFFER_WINDOW = 0.25;

// Standard gamepad mapping (https://w3c.github.io/gamepad/#remapping).
const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const STICK_DEADZONE = 0.18;
const TRIGGER_THRESHOLD = 0.4;
/** Stick deflection below which the character walks rather than runs. */
const WALK_DEFLECTION = 0.55;

/**
 * Keyboard, mouse and gamepad. Gameplay reads `getState()` once per fixed step; presses are stamped with the
 * gameplay clock (`advance`) so the buffer window means the same thing in slow motion. Menus listen to
 * `onMenu`, which both devices feed.
 */
export class InputManager {
  private static instance: InputManager | null = null;
  public keys: Record<string, boolean> = {};
  public isPointerLocked = false;
  public walkToggled = false;
  /** The device used last: prompts and glyphs follow it. */
  public device: InputDevice = 'keyboard';

  private mouseDX = 0;
  private mouseDY = 0;
  private mouseGuard = false;
  private clock = 0;
  private readonly pressedAt = new Map<PressAction, number>();

  private pad: Gamepad | null = null;
  private readonly padPrev: boolean[] = [];
  private padMove = { x: 0, y: 0 };
  private padLook = { x: 0, y: 0 };
  private padSprint = false;
  private navRepeat = { dir: '' as MenuAction | '', next: 0 };
  /** The rumble playing: until when, and how strong (a weaker request does not cut it short). */
  private rumbleUntil = 0;
  private rumbleMagnitude = 0;
  private padUsed = false;

  public onPointerLockChange: ((locked: boolean) => void) | null = null;
  public onMenu: ((action: MenuAction) => void) | null = null;
  public onDeviceChange: ((device: InputDevice) => void) | null = null;
  /** Any key, click or button: used to reveal "hold to skip" during cutscenes. */
  public onAnyInput: (() => void) | null = null;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): InputManager {
    if (!InputManager.instance) InputManager.instance = new InputManager();
    return InputManager.instance;
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
      // Space, Enter and arrows would otherwise scroll the page or press whichever button has browser focus
      // (menus handle confirm themselves).
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code.startsWith('Arrow') || e.code === 'Tab') {
        e.preventDefault();
      }
      this.useDevice('keyboard');
      this.keys[e.code] = true;
      if (e.repeat) {
        if (e.code.startsWith('Arrow')) this.emitMenuFromKey(e.code);
        return;
      }
      this.onAnyInput?.();
      if (PRESS_KEYS[e.code]) this.press(PRESS_KEYS[e.code]);
      if (e.code === 'KeyC') this.walkToggled = !this.walkToggled;
      this.emitMenuFromKey(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // A key released while the page had no focus never sends its keyup; left "held" it would keep steering.
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseAll();
    });

    window.addEventListener('mousedown', (e) => {
      this.useDevice('keyboard');
      this.onAnyInput?.();
      if (!this.isPointerLocked) return;
      if (e.button === 0) this.press('attack');
      else if (e.button === 2) {
        this.keys.Mouse2 = true;
        this.press('parry');
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) this.keys.Mouse2 = false;
    });

    window.addEventListener('contextmenu', (e) => {
      if (this.isPointerLocked) e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      // The first event after locking can carry a huge jump from where the cursor was.
      if (this.mouseGuard) {
        this.mouseGuard = false;
        return;
      }
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.useDevice('keyboard');
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement !== null;
      this.mouseGuard = this.isPointerLocked;
      if (!this.isPointerLocked) {
        this.keys.Mouse2 = false;
        this.pressedAt.delete('attack');
        this.pressedAt.delete('parry');
      }
      this.onPointerLockChange?.(this.isPointerLocked);
    });

    window.addEventListener('gamepadconnected', (e) => {
      console.log(`[Input] Controller connected: ${(e as GamepadEvent).gamepad.id}`);
    });
  }

  private emitMenuFromKey(code: string): void {
    const map: Record<string, MenuAction> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down',
      Enter: 'confirm', NumpadEnter: 'confirm', Escape: 'back', Backspace: 'back',
    };
    const action = map[code];
    if (action) this.onMenu?.(action);
  }

  private useDevice(device: InputDevice): void {
    if (device === 'gamepad') this.padUsed = true;
    if (this.device === device) return;
    this.device = device;
    this.onDeviceChange?.(device);
  }

  private press(action: PressAction): void {
    this.pressedAt.set(action, this.clock);
  }

  /** Advances the gameplay clock the press buffers are measured on (call once per fixed step). */
  public advance(dt: number): void {
    this.clock += dt;
  }

  /** Lets go of every held key and button and forgets pending presses. */
  public releaseAll(): void {
    this.keys = {};
    this.pressedAt.clear();
    this.padSprint = false;
  }

  /** A press of `action` within the buffer window that nothing has used yet. */
  public pressed(action: PressAction): boolean {
    const at = this.pressedAt.get(action);
    return at !== undefined && this.clock - at <= BUFFER_WINDOW;
  }

  public consume(action: PressAction): void {
    this.pressedAt.delete(action);
  }

  /** Locks the mouse to the game. Resolves false if the browser refused (e.g. right after Esc released it). */
  public async requestPointerLock(element: HTMLElement): Promise<boolean> {
    if (document.pointerLockElement === element) return true;
    try {
      const result = element.requestPointerLock() as unknown as Promise<void> | undefined;
      if (result && typeof result.then === 'function') await result;
      return true;
    } catch (err) {
      console.warn('[Input] Pointer lock refused:', (err as Error).message);
      return false;
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /**
   * Reads the first connected gamepad: sticks, held buttons and new presses. Call once per rendered frame,
   * before simulation steps. `now` is wall-clock seconds (menu repeat timing).
   */
  public poll(now: number): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.pad = null;
    for (const p of pads) {
      if (p && p.connected) {
        this.pad = p;
        break;
      }
    }
    const pad = this.pad;
    if (!pad) {
      this.padMove.x = this.padMove.y = this.padLook.x = this.padLook.y = 0;
      return;
    }
    const held = (i: number) => {
      const b = pad.buttons[i];
      if (!b) return false;
      return i === PAD.LT || i === PAD.RT ? b.value > TRIGGER_THRESHOLD : b.pressed;
    };
    const down = (i: number) => held(i) && !this.padPrev[i];

    const move = radial(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
    const look = radial(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
    this.padMove = { x: move.x, y: -move.y };
    this.padLook = look;

    let any = Math.hypot(move.x, move.y) > 0.3 || Math.hypot(look.x, look.y) > 0.3;
    for (let i = 0; i < pad.buttons.length; i++) if (down(i)) any = true;
    if (any) {
      this.useDevice('gamepad');
      if (pad.buttons.some((_, i) => down(i))) this.onAnyInput?.();
    }

    if (down(PAD.A)) this.press('jump');
    if (down(PAD.B)) this.press('dodge');
    if (down(PAD.DOWN)) this.press('stow');
    if (down(PAD.X) || down(PAD.RB)) this.press('attack');
    if (down(PAD.Y) || down(PAD.RT)) this.press('charge');
    if (down(PAD.LB) || down(PAD.LT)) this.press('parry');
    if (down(PAD.L3)) this.padSprint = !this.padSprint;
    if (Math.hypot(move.x, move.y) < 0.2) this.padSprint = false;
    if (down(PAD.BACK)) this.walkToggled = !this.walkToggled;

    // Menus: buttons, d-pad and the left stick (with key-repeat style auto-repeat).
    if (down(PAD.START)) this.onMenu?.('pause');
    if (down(PAD.A)) this.onMenu?.('confirm');
    if (down(PAD.B)) this.onMenu?.('back');
    let dir: MenuAction | '' = '';
    if (held(PAD.UP) || move.y < -0.6) dir = 'up';
    else if (held(PAD.DOWN) || move.y > 0.6) dir = 'down';
    else if (held(PAD.LEFT) || move.x < -0.6) dir = 'left';
    else if (held(PAD.RIGHT) || move.x > 0.6) dir = 'right';
    if (dir !== this.navRepeat.dir) {
      this.navRepeat = { dir, next: now + 0.38 };
      if (dir) this.onMenu?.(dir);
    } else if (dir && now >= this.navRepeat.next) {
      this.navRepeat.next = now + 0.12;
      this.onMenu?.(dir);
    }

    for (let i = 0; i < pad.buttons.length; i++) this.padPrev[i] = held(i);
  }

  /**
   * Rumbles the controller (heavy blows on the strong, low motor; crisp ones, a deflect or a block, on the weak, high
   * one), scaled by the Vibration setting. Nothing on a keyboard, or where the browser has no haptics. A newer effect
   * replaces the one playing, unless it is the weaker of the two.
   */
  public rumble(strong: number, weak: number, ms: number): void {
    const k = Settings.get().vibration;
    const actuator = this.pad?.vibrationActuator as (GamepadHapticActuator & { playEffect?: GamepadHapticActuator['playEffect'] }) | null | undefined;
    if (this.device !== 'gamepad' || k <= 0 || ms <= 0 || !actuator?.playEffect) return;
    const now = performance.now();
    const magnitude = (strong + weak) * k;
    if (now < this.rumbleUntil && magnitude < this.rumbleMagnitude) return;
    this.rumbleUntil = now + ms;
    this.rumbleMagnitude = magnitude;
    actuator.playEffect('dual-rumble', {
      duration: ms, strongMagnitude: Math.min(1, strong * k), weakMagnitude: Math.min(1, weak * k),
    }).catch(() => undefined);
  }

  /** A controller has been used this session (the Vibration setting is shown from then on). */
  public get padSeen(): boolean {
    return this.padUsed;
  }

  /** Whether the skip button for cutscenes is held (Space, Enter or A). */
  public skipHeld(): boolean {
    return !!(this.keys.Space || this.keys.Enter || this.keys.NumpadEnter) || !!this.pad?.buttons[PAD.A]?.pressed;
  }

  public getState(): InputState {
    const k = this.keys;
    let x = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
    let y = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
    const keyLen = Math.hypot(x, y);
    if (keyLen > 0) {
      x /= keyLen;
      y /= keyLen;
    }
    const padLen = Math.hypot(this.padMove.x, this.padMove.y);
    const usePad = keyLen === 0 && padLen > 0;
    if (usePad) {
      x = this.padMove.x;
      y = this.padMove.y;
    }
    const padHeld = (i: number) => !!this.pad?.buttons[i]?.pressed || (i >= PAD.LT && i <= PAD.RT && (this.pad?.buttons[i]?.value ?? 0) > TRIGGER_THRESHOLD);

    return {
      moveX: x,
      moveY: y,
      sprint: !!(k.ShiftLeft || k.ShiftRight) || (usePad && this.padSprint),
      walk: this.walkToggled || (usePad && padLen < WALK_DEFLECTION),
      attack: this.pressed('attack'),
      parry: !!k.Mouse2 || padHeld(PAD.LB) || padHeld(PAD.LT),
      parryPressed: this.pressed('parry'),
      jump: this.pressed('jump'),
      dodge: this.pressed('dodge'),
      stow: this.pressed('stow'),
      chargePressed: this.pressed('charge'),
      charge: !!k.KeyQ || padHeld(PAD.Y) || padHeld(PAD.RT),
    };
  }

  /**
   * Camera turn since the last call, in radians (yaw, pitch; positive pitch looks down), from the mouse and the
   * right stick. Called once per rendered frame.
   */
  public consumeLook(dt: number): { yaw: number; pitch: number } {
    const s = Settings.get();
    const mouse = 0.0022 * s.mouseSensitivity;
    const pad = s.padLookSpeed * dt;
    const invert = s.invertY ? -1 : 1;
    const out = {
      yaw: this.mouseDX * mouse + this.padLook.x * pad,
      pitch: (this.mouseDY * mouse + this.padLook.y * pad * 0.7) * invert,
    };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return out;
  }

  /** Throws away pending mouse motion (cutscenes, menus). */
  public discardLook(): void {
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}

/** Radial deadzone, rescaled so motion starts from zero at its edge. */
function radial(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len < STICK_DEADZONE) return { x: 0, y: 0 };
  const scaled = Math.min(1, (len - STICK_DEADZONE) / (1 - STICK_DEADZONE));
  return { x: (x / len) * scaled, y: (y / len) * scaled };
}
