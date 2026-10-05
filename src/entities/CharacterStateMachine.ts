export type CharacterState =
  | 'IDLE'
  /**
   * Standing at ease, out of the fight: a calm standing idle, never a guard. Nothing changes into it; it is the clip
   * IDLE plays while the character is `atEase` (cutscenes, the start of a chapter, after the battle). See Character.
   */
  | 'REST'
  | 'WALK'
  | 'MOVE'
  | 'SPRINT'
  | 'STRAFE_LEFT' // enemies circling, facing their target
  | 'STRAFE_RIGHT'
  | 'WALK_BACK' // backing off, facing their target
  | 'JUMP' // ends on landing (the controller decides)
  | 'DODGE' // the slide: low and untouchable for part of it
  | 'ATTACK_1'
  | 'ATTACK_2'
  | 'ATTACK_3'
  | 'ATTACK_JUMP' // leaping strike out of a sprint
  | 'CHARGE' // gathering power; held, so the controller ends it
  | 'CAST' // a ranged attack (a projectile or wave does the damage, not the blade)
  | 'PARRY'
  | 'BLOCK' // guard held after the parry window; the controller ends it
  | 'BLOCK_HIT' // a blow taken on the guard
  | 'SHEATHE'
  | 'DRAW'
  | 'STAGGER'
  | 'DEFLECTED'
  | 'POSTURE_BROKEN'
  | 'DEAD';

/** Timers an animated character sets from its clips (see Character.attachRig). */
export type TimedStateKey =
  | 'ATTACK_1_DURATION' | 'ATTACK_2_DURATION' | 'ATTACK_3_DURATION' | 'ATTACK_JUMP_DURATION'
  | 'CHARGE_DURATION' | 'BLOCK_HIT_DURATION' | 'SHEATHE_DURATION' | 'DRAW_DURATION' | 'STAGGER_DURATION'
  | 'CAST_DURATION' | 'DODGE_DURATION';

export class CharacterStateMachine {
  public currentState: CharacterState = 'IDLE';
  public stateTime = 0; // Duration in current state in seconds
  public isParryActive = false; // True during the 140ms deflection window
  public isAttacking = false;
  public comboQueued = false;
  public comboWindowOpen = false;
  /** The guard button is held: a parry or a blocked blow settles into BLOCK instead of IDLE. */
  public guardHeld = false;

  // Timings for states (in seconds)
  public readonly PARRY_WINDOW_DURATION = 0.14; // 140ms deflection frame
  public readonly PARRY_TOTAL_DURATION = 0.42;

  // Attack timings are per instance: an animated character sets them from its clip lengths.
  public ATTACK_1_DURATION = 0.38;
  public ATTACK_2_DURATION = 0.42;
  public ATTACK_3_DURATION = 0.58;
  public ATTACK_JUMP_DURATION = 0.9;

  public CHARGE_DURATION = 1.6;
  public BLOCK_HIT_DURATION = 0.4;
  public SHEATHE_DURATION = 1.0;
  public DRAW_DURATION = 0.8;
  public STAGGER_DURATION = 0.35;
  public CAST_DURATION = 0.7;
  public DODGE_DURATION = 0.8;
  /**
   * Per attack: from when (state seconds) a queued follow-up may cut the rest of the swing short. Without an entry
   * the whole attack plays out first (enemies). The player's are set where each swing's blade has finished.
   */
  public cancelAt: Partial<Record<CharacterState, number>> = {};
  public readonly DEFLECTED_DURATION = 0.75;
  public readonly POSTURE_BROKEN_DURATION = 2.5;

  /** Length of an attack state (for hit windows); 0 for anything else. */
  public attackDuration(state: CharacterState = this.currentState): number {
    switch (state) {
      case 'ATTACK_1': return this.ATTACK_1_DURATION;
      case 'ATTACK_2': return this.ATTACK_2_DURATION;
      case 'ATTACK_3': return this.ATTACK_3_DURATION;
      case 'ATTACK_JUMP': return this.ATTACK_JUMP_DURATION;
      default: return 0;
    }
  }

  public onStateChanged: ((newState: CharacterState, oldState: CharacterState) => void) | null = null;

  public changeState(newState: CharacterState): void {
    if (this.currentState === 'DEAD') return;
    if (this.currentState === 'POSTURE_BROKEN' && newState !== 'IDLE' && newState !== 'DEAD') return;

    const oldState = this.currentState;
    this.currentState = newState;
    this.stateTime = 0;
    this.comboQueued = false;

    // Reset flags
    this.isParryActive = false;
    this.isAttacking = false;
    this.comboWindowOpen = false;

    if (newState === 'PARRY') {
      this.isParryActive = true;
    } else if (newState.startsWith('ATTACK')) {
      this.isAttacking = true;
    }

    if (this.onStateChanged) {
      this.onStateChanged(newState, oldState);
    }
  }

  /** A follow-up is queued and the current swing has reached its cancel point. */
  private chainNow(): boolean {
    const at = this.cancelAt[this.currentState];
    return this.comboQueued && at !== undefined && this.stateTime >= at;
  }

  /** Respawn: back to IDLE even from DEAD / POSTURE_BROKEN, which `changeState` deliberately refuses to leave. */
  public reset(): void {
    const oldState = this.currentState;
    this.currentState = 'IDLE';
    this.stateTime = 0;
    this.comboQueued = false;
    this.isParryActive = false;
    this.isAttacking = false;
    this.comboWindowOpen = false;
    this.onStateChanged?.('IDLE', oldState);
  }

  public update(dt: number): void {
    this.stateTime += dt;

    switch (this.currentState) {
      case 'PARRY':
        // 140ms active deflection window
        if (this.stateTime > this.PARRY_WINDOW_DURATION) {
          this.isParryActive = false;
        }
        if (this.stateTime >= this.PARRY_TOTAL_DURATION) {
          this.changeState(this.guardHeld ? 'BLOCK' : 'IDLE');
        }
        break;

      case 'CAST':
        if (this.stateTime >= this.CAST_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'BLOCK_HIT':
        if (this.stateTime >= this.BLOCK_HIT_DURATION) {
          this.changeState(this.guardHeld ? 'BLOCK' : 'IDLE');
        }
        break;

      case 'ATTACK_JUMP':
        if (this.stateTime >= this.ATTACK_JUMP_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'DODGE':
        if (this.stateTime >= this.DODGE_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'SHEATHE':
        if (this.stateTime >= this.SHEATHE_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'DRAW':
        if (this.stateTime >= this.DRAW_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'ATTACK_1':
        // Combo input buffer window opens at 55% of animation
        if (this.stateTime >= this.ATTACK_1_DURATION * 0.45) {
          this.comboWindowOpen = true;
        }
        if (this.stateTime >= this.ATTACK_1_DURATION || this.chainNow()) {
          if (this.comboQueued) {
            this.changeState('ATTACK_2');
          } else {
            this.changeState('IDLE');
          }
        }
        break;

      case 'ATTACK_2':
        if (this.stateTime >= this.ATTACK_2_DURATION * 0.45) {
          this.comboWindowOpen = true;
        }
        if (this.stateTime >= this.ATTACK_2_DURATION || this.chainNow()) {
          if (this.comboQueued) {
            this.changeState('ATTACK_3');
          } else {
            this.changeState('IDLE');
          }
        }
        break;

      case 'ATTACK_3':
        if (this.stateTime >= this.ATTACK_3_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'STAGGER':
        if (this.stateTime >= this.STAGGER_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'DEFLECTED':
        if (this.stateTime >= this.DEFLECTED_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'POSTURE_BROKEN':
        if (this.stateTime >= this.POSTURE_BROKEN_DURATION) {
          this.changeState('IDLE');
        }
        break;

      default:
        break;
    }
  }
}
