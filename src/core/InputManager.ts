export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  dodge: boolean;
  attack: boolean;
  parry: boolean;
  mouseXDelta: number;
  mouseYDelta: number;
}

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
        // Right Click: Parry
        this.parryRequested = true;
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
      dodge,
      attack,
      parry,
      mouseXDelta: this.mouseXDelta,
      mouseYDelta: this.mouseYDelta
    };

    this.mouseXDelta = 0;
    this.mouseYDelta = 0;

    return state;
  }
}
