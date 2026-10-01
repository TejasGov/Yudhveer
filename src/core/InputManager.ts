export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  /** Walk instead of run (C toggles it). */
  walk: boolean;
  dodge: boolean;
  attack: boolean;
  /** Guard button (RMB) held. */
  parry: boolean;
  /** Fresh, unused presses within the buffer window; the controller `consume`s one when it acts on it. */
  parryPressed: boolean;
  jump: boolean;
  stow: boolean;
  chargePressed: boolean;
  /** Charge button (Q) held. */
  charge: boolean;
  mouseXDelta: number;
  mouseYDelta: number;
}

/** Buffered one-shot presses: RMB parry, F jump, X sheathe / draw, Q starting a charge. */
export type PressAction = 'parry' | 'jump' | 'stow' | 'charge';
const PRESS_KEYS: Record<string, PressAction> = { KeyF: 'jump', KeyX: 'stow', KeyQ: 'charge' };

export class InputManager {
  private static instance: InputManager | null = null;
  public keys: Record<string, boolean> = {};
  public mouseXDelta = 0;
  public mouseYDelta = 0;
  public isPointerLocked = false;
  
  // Combat Input Buffering (The "No Stutter" Combo System)
  public attackBuffered = false;
  public parryRequested = false;
  public dodgeBuffered = false;

  private bufferWindow = 250; // 250ms window to store queued action clicks
  private attackBufferTimer: ReturnType<typeof setTimeout> | null = null;
  private dodgeBufferTimer: ReturnType<typeof setTimeout> | null = null;
  private pressedAt = new Map<PressAction, number>();
  public walkToggled = false;

  public onPointerLockChange: ((locked: boolean) => void) | null = null;

  private constructor() {
    this.setupEventListeners();
  }

  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        this.queueDodge();
      }
      if (e.repeat) return;
      if (PRESS_KEYS[e.code]) this.pressedAt.set(PRESS_KEYS[e.code], performance.now());
      if (e.code === 'KeyC') this.walkToggled = !this.walkToggled;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) return;

      if (e.button === 0) {
        // Left Click: Attack (Buffered with 250ms decay)
        this.queueAttack();
      } else if (e.button === 2) {
        // Right Click: a press is a parry, holding it on is a guard
        this.parryRequested = true;
        this.pressedAt.set('parry', performance.now());
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.parryRequested = false;
      }
    });

    // Prevent default context menu on right click in combat
    window.addEventListener('contextmenu', (e) => {
      if (this.isPointerLocked) {
        e.preventDefault();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.mouseXDelta += e.movementX;
        this.mouseYDelta += e.movementY;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement !== null;
      if (this.onPointerLockChange) {
        this.onPointerLockChange(this.isPointerLocked);
      }
    });
  }

  /**
   * Queue attack into 250ms buffer
   */
  public queueAttack(): void {
    this.attackBuffered = true;
    if (this.attackBufferTimer) clearTimeout(this.attackBufferTimer);
    this.attackBufferTimer = setTimeout(() => {
      this.attackBuffered = false;
    }, this.bufferWindow);
  }

  /**
   * Consume buffered attack click
   */
  public consumeAttack(): boolean {
    if (this.attackBuffered) {
      this.attackBuffered = false;
      if (this.attackBufferTimer) clearTimeout(this.attackBufferTimer);
      return true;
    }
    return false;
  }

  /**
   * Queue dodge roll into 250ms buffer
   */
  public queueDodge(): void {
    this.dodgeBuffered = true;
    if (this.dodgeBufferTimer) clearTimeout(this.dodgeBufferTimer);
    this.dodgeBufferTimer = setTimeout(() => {
      this.dodgeBuffered = false;
    }, this.bufferWindow);
  }

  /**
   * Consume buffered dodge action
   */
  public consumeDodge(): boolean {
    if (this.dodgeBuffered) {
      this.dodgeBuffered = false;
      if (this.dodgeBufferTimer) clearTimeout(this.dodgeBufferTimer);
      return true;
    }
    return false;
  }

  /** A press of `action` within the buffer window that nothing has used yet. */
  public pressed(action: PressAction): boolean {
    const at = this.pressedAt.get(action);
    return at !== undefined && performance.now() - at <= this.bufferWindow;
  }

  public consume(action: PressAction): void {
    this.pressedAt.delete(action);
  }

  public requestPointerLock(element?: HTMLElement): void {
    try {
      const target = element || document.body;
      if (target && target.requestPointerLock) {
        target.requestPointerLock();
      }
    } catch (e) {
      console.warn('[InputManager] Pointer lock request caught:', e);
    }
  }

  public exitPointerLock(): void {
    try {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    } catch (e) {
      console.warn('[InputManager] Pointer lock exit caught:', e);
    }
  }

  public getState(): InputState {
    const forward = !!(this.keys['KeyW'] || this.keys['ArrowUp']);
    const backward = !!(this.keys['KeyS'] || this.keys['ArrowDown']);
    const left = !!(this.keys['KeyA'] || this.keys['ArrowLeft']);
    const right = !!(this.keys['KeyD'] || this.keys['ArrowRight']);
    const sprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    
    const attack = this.consumeAttack();
    const parry = this.parryRequested;
    const dodge = this.consumeDodge();

    const state: InputState = {
      forward,
      backward,
      left,
      right,
      sprint,
      walk: this.walkToggled,
      dodge,
      attack,
      parry,
      parryPressed: this.pressed('parry'),
      jump: this.pressed('jump'),
      stow: this.pressed('stow'),
      chargePressed: this.pressed('charge'),
      charge: !!this.keys['KeyQ'],
      mouseXDelta: this.mouseXDelta,
      mouseYDelta: this.mouseYDelta
    };

    return state;
  }

  /**
   * Mouse motion accumulated since the last call. The camera consumes it once per rendered frame;
   * getState() only reports it, since gameplay may poll input several times per frame (fixed step).
   */
  public consumeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseXDelta, y: this.mouseYDelta };
    this.mouseXDelta = 0;
    this.mouseYDelta = 0;
    return delta;
  }
}
