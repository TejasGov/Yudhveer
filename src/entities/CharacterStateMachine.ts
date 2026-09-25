export type CharacterState =
  | 'IDLE'
  | 'MOVE'
  | 'SPRINT'
  | 'DODGE_ROLL'
  | 'ATTACK_1'
  | 'ATTACK_2'
  | 'ATTACK_3'
  | 'PARRY'
  | 'BLOCK'
  | 'STAGGER'
  | 'DEFLECTED'
  | 'POSTURE_BROKEN'
  | 'DEAD';

export class CharacterStateMachine {
  public currentState: CharacterState = 'IDLE';
  public stateTime = 0; // Duration in current state in seconds
  public isInvulnerable = false;
  public isParryActive = false; // True during the 140ms deflection window
  public isAttacking = false;
  public comboQueued = false;
  public comboWindowOpen = false;

  // Timings for states (in seconds)
  public readonly PARRY_WINDOW_DURATION = 0.14; // 140ms deflection frame
  public readonly PARRY_TOTAL_DURATION = 0.42;
  public readonly DODGE_DURATION = 0.48;
  public readonly DODGE_IFRAME_DURATION = 0.32;
  
  public readonly ATTACK_1_DURATION = 0.38;
  public readonly ATTACK_2_DURATION = 0.42;
  public readonly ATTACK_3_DURATION = 0.58;
  
  public readonly STAGGER_DURATION = 0.35;
  public readonly DEFLECTED_DURATION = 0.75;
  public readonly POSTURE_BROKEN_DURATION = 2.5;

  public onStateChanged: ((newState: CharacterState, oldState: CharacterState) => void) | null = null;

  public changeState(newState: CharacterState): void {
    if (this.currentState === 'DEAD') return;
    if (this.currentState === 'POSTURE_BROKEN' && newState !== 'IDLE' && newState !== 'DEAD') return;

    const oldState = this.currentState;
    this.currentState = newState;
    this.stateTime = 0;
    this.comboQueued = false;

    // Reset flags
    this.isInvulnerable = false;
    this.isParryActive = false;
    this.isAttacking = false;
    this.comboWindowOpen = false;

    if (newState === 'DODGE_ROLL') {
      this.isInvulnerable = true;
    } else if (newState === 'PARRY') {
      this.isParryActive = true;
    } else if (newState === 'ATTACK_1' || newState === 'ATTACK_2' || newState === 'ATTACK_3') {
      this.isAttacking = true;
    }

    if (this.onStateChanged) {
      this.onStateChanged(newState, oldState);
    }
  }

  public update(dt: number): void {
    this.stateTime += dt;

    switch (this.currentState) {
      case 'DODGE_ROLL':
        // Invulnerability ends after i-frame window
        if (this.stateTime > this.DODGE_IFRAME_DURATION) {
          this.isInvulnerable = false;
        }
        if (this.stateTime >= this.DODGE_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'PARRY':
        // 140ms active deflection window
        if (this.stateTime > this.PARRY_WINDOW_DURATION) {
          this.isParryActive = false;
        }
        if (this.stateTime >= this.PARRY_TOTAL_DURATION) {
          this.changeState('IDLE');
        }
        break;

      case 'ATTACK_1':
        // Combo input buffer window opens at 55% of animation
        if (this.stateTime >= this.ATTACK_1_DURATION * 0.45) {
          this.comboWindowOpen = true;
        }
        if (this.stateTime >= this.ATTACK_1_DURATION) {
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
        if (this.stateTime >= this.ATTACK_2_DURATION) {
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
