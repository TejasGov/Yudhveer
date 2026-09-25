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
  public keys: { [code: string]: boolean } = {};
  public mouseXDelta = 0;
  public mouseYDelta = 0;
  public isPointerLocked = false;
  
  // Buffers for snappy combat triggers
  public attackBuffered = false;
  public parryBuffered = false;
  public dodgeBuffered = false;

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
        this.dodgeBuffered = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) return;
      if (e.button === 0) {
        this.attackBuffered = true;
      } else if (e.button === 2) {
        this.parryBuffered = true;
      }
    });

    // Prevent context menu on right click in combat
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
    
    const attack = this.attackBuffered;
    const parry = this.parryBuffered;
    const dodge = this.dodgeBuffered;

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

    // Consume single-frame impulse triggers
    this.attackBuffered = false;
    this.parryBuffered = false;
    this.dodgeBuffered = false;
    this.mouseXDelta = 0;
    this.mouseYDelta = 0;

    return state;
  }
}
