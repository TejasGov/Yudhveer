import * as THREE from 'three';
import { Character } from './Character';
import type { CharacterState } from './CharacterStateMachine';
import { InputManager, type InputState } from '../core/InputManager';
import { SoundFX } from '../combat/SoundFX';
import { ParticleFX } from '../combat/ParticleFX';

/** A completed charge (hold Q) empowers this many blows, each dealing this much more damage and posture. */
const CHARGED_HITS = 3;
export const CHARGED_MULTIPLIER = 1.6;

export class Player extends Character {
  private inputManager: InputManager;
  private soundFX: SoundFX;
  private particleFX: ParticleFX;
  public cameraYaw: number = 0;

  /** Blows still empowered by a completed charge. */
  public chargedHits = 0;
  /** Called when a charge completes (the engine shows the banner). */
  public onCharged: (() => void) | null = null;
  /** Ground speed carried through the current jump, and when it touched down (state seconds, -1 while airborne). */
  private jumpCarry = 0;
  private jumpLandedAt = -1;

  constructor() {
    super('player_hero', 0xd4af37); // Royal Gold

    this.inputManager = InputManager.getInstance();
    this.soundFX = SoundFX.getInstance();
    this.particleFX = ParticleFX.getInstance();

    // Setup state change hooks
    this.stateMachine.onStateChanged = (newState) => {
      this.updateHudBadge(newState);

      if (newState.startsWith('ATTACK')) {
        const pitch = newState === 'ATTACK_1' ? 1.0 : newState === 'ATTACK_2' ? 1.15 : 0.85;
        this.soundFX.playSwordSwing(pitch);
      } else if (newState === 'DODGE_ROLL') {
        this.soundFX.playDodgeWhoosh();
        this.particleFX.spawnDustPuff(this.getPosition(), 14);
      }
    };
  }

  public handleInput(dt: number, cameraYaw: number): void {
    this.cameraYaw = cameraYaw;
    const input = this.inputManager.getState();
    const sm = this.stateMachine;
    const state = sm.currentState;
    sm.guardHeld = input.parry;

    // Don't allow new actions during locked states
    if (state === 'POSTURE_BROKEN' || state === 'DEAD') {
      return;
    }

    const grounded = this.motor?.grounded ?? true;
    const free = state === 'IDLE' || state === 'WALK' || state === 'MOVE' || state === 'SPRINT';
    const moveVec = this.calculateInputDirection(input);
    const moving = moveVec.lengthSq() > 0.001;

    // 1. Dhal (Right Click): a press opens the 140 ms parry window, holding on settles into a guard.
    if (input.parryPressed && (free || state === 'BLOCK') && grounded) {
      this.inputManager.consume('parry');
      sm.changeState('PARRY');
      return;
    }
    if (input.parry && free && grounded) {
      sm.changeState('BLOCK');
      return;
    }

    // 2. Attack Trigger (Left Click) & Combo Chaining. Sheathed, the first click draws the sword; out of a sprint
    // it is a leaping strike.
    if (input.attack || this.inputManager.attackBuffered) {
      if ((free || state === 'BLOCK') && grounded) {
        this.inputManager.consumeAttack();
        if (this.swordSheathed) sm.changeState('DRAW');
        else if (state === 'SPRINT' && this.rig?.definition.states.ATTACK_JUMP) sm.changeState('ATTACK_JUMP');
        else sm.changeState('ATTACK_1');
        return;
      } else if ((state === 'ATTACK_1' || state === 'ATTACK_2') && sm.comboWindowOpen) {
        this.inputManager.consumeAttack();
        sm.comboQueued = true;
      }
    }

    // 3. Dodge Roll Trigger (Space); it also breaks off a guard, a charge or a sheathe.
    const dodgeable = free || state === 'ATTACK_1' || state === 'ATTACK_2' || state === 'BLOCK' || state === 'CHARGE' ||
      state === 'SHEATHE' || state === 'DRAW';
    if (input.dodge && dodgeable && grounded) {
      if (moving) {
        this.dodgeDirection.copy(moveVec).normalize();
      } else {
        // Default to facing direction
        this.group.getWorldDirection(this.dodgeDirection);
      }
      sm.changeState('DODGE_ROLL');
      return;
    }

    // 4. Jump (F): a running jump on the move, carrying the speed it started with.
    if (input.jump && (free || state === 'BLOCK') && grounded) {
      this.inputManager.consume('jump');
      const running = moving && (state === 'MOVE' || state === 'SPRINT');
      this.jumpCarry = moving ? this.speedOf(this.locomotionState(input)) : this.walkSpeed;
      this.jumpLandedAt = -1;
      this.beginJump(running);
      return;
    }

    // 5. Charge (press and hold Q; a finished charge needs a fresh press) and sheathe / draw (X).
    if (input.chargePressed && input.charge && free && grounded && !this.swordSheathed) {
      this.inputManager.consume('charge');
      sm.changeState('CHARGE');
      return;
    }
    if (input.stow && free && grounded) {
      this.inputManager.consume('stow');
      sm.changeState(this.swordSheathed ? 'DRAW' : 'SHEATHE');
      return;
    }

    // 6. Movement handling
    let moveMagnitude = 0;
    if (free) {
      if (moving) {
        moveMagnitude = 1;
        const target = this.locomotionState(input);
        if (state !== target) sm.changeState(target);
        this.group.position.addScaledVector(moveVec, this.speedOf(target) * dt);
        this.turnTowards(moveVec, dt);
      } else if (state !== 'IDLE') {
        sm.changeState('IDLE');
      }
    } else if (state === 'JUMP') {
      this.updateJump(input, moveVec, moving, dt);
    } else if (state === 'CHARGE') {
      if (!input.charge) {
        sm.changeState('IDLE'); // let go early: nothing gathered
      } else if (sm.stateTime >= sm.CHARGE_DURATION) {
        this.chargedHits = CHARGED_HITS;
        this.soundFX.playParryClash();
        this.particleFX.spawnSparks(this.getPosition().clone().setY(this.getPosition().y + 1.2), 45, true);
        sm.changeState('IDLE');
        this.onCharged?.();
      }
    } else if (state === 'BLOCK') {
      // The guard faces where the camera looks.
      if (!input.parry) sm.changeState('IDLE');
      else this.turnTowards(new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)), dt);
    } else if (state === 'DODGE_ROLL') {
      // Move in dodge direction
      this.group.position.addScaledVector(this.dodgeDirection, this.dodgeSpeed * dt);
      this.group.rotation.y = Math.atan2(this.dodgeDirection.x, this.dodgeDirection.z);
    } else if (state.startsWith('ATTACK') && !this.rigDrivesMotion(state)) {
      // Subtle forward lunge during attacks
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      const lungeSpeed = state === 'ATTACK_3' ? 3.5 : 1.8;
      this.group.position.addScaledVector(forward, lungeSpeed * dt);
    }

    this.updateProceduralAnimations(dt, moveMagnitude);
  }

  /**
   * Leaves the ground at the clip's takeoff, steers in the air at the speed the jump began with, and on touchdown
   * lets the landing play out (or runs straight on if a direction is held).
   */
  private updateJump(input: InputState, moveVec: THREE.Vector3, moving: boolean, dt: number): void {
    const sm = this.stateMachine;
    if (!this.jumpLaunched && sm.stateTime >= this.jump.takeoff) {
      this.motor?.launch(this.jump.speed);
      this.jumpLaunched = true;
    }
    if (moving) {
      this.group.position.addScaledVector(moveVec, this.jumpCarry * dt);
      this.turnTowards(moveVec, dt);
    }
    if (!this.jumpLaunched || !(this.motor?.grounded ?? true)) return;
    if (this.jumpLandedAt < 0) {
      this.jumpLandedAt = sm.stateTime;
      this.particleFX.spawnDustPuff(this.getPosition(), 10);
    }
    if (moving) sm.changeState(this.locomotionState(input));
    else if (sm.stateTime - this.jumpLandedAt >= this.jump.recovery) sm.changeState('IDLE');
  }

  private locomotionState(input: InputState): CharacterState {
    return input.sprint ? 'SPRINT' : input.walk ? 'WALK' : 'MOVE';
  }

  private speedOf(state: CharacterState): number {
    return state === 'SPRINT' ? this.sprintSpeed : state === 'WALK' ? this.walkSpeed : this.moveSpeed;
  }

  /** Turns smoothly to face `dir` (horizontal). */
  private turnTowards(dir: THREE.Vector3, dt: number): void {
    let diff = Math.atan2(dir.x, dir.z) - this.group.rotation.y;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.group.rotation.y += diff * Math.min(1.0, this.rotationSpeed * dt);
  }

  private calculateInputDirection(input: InputState): THREE.Vector3 {
    const forward = new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw));
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

    const dir = new THREE.Vector3();
    if (input.forward) dir.add(forward.clone().negate());
    if (input.backward) dir.add(forward);
    if (input.left) dir.add(right.clone().negate());
    if (input.right) dir.add(right);

    if (dir.lengthSq() > 0.001) {
      dir.normalize();
    }
    return dir;
  }

  private updateHudBadge(state: string): void {
    const badge = document.getElementById('badge-state');
    if (badge) {
      const resting = state === 'IDLE' || state === 'WALK' || state === 'MOVE' || state === 'SPRINT';
      badge.textContent = `◆ KHANDA [${this.swordSheathed && resting ? 'SHEATHED' : state.replace('_', ' ')}]`;
      if (state.startsWith('ATTACK')) {
        badge.className = 'text-red-400 font-bold';
      } else if (state === 'DODGE_ROLL') {
        badge.className = 'text-blue-400 font-bold';
      } else {
        badge.className = 'text-zinc-300';
      }
    }

    const dhalBadge = document.getElementById('badge-parry');
    if (dhalBadge) {
      if (state === 'PARRY') {
        dhalBadge.textContent = '◇ DHAL [DEFLECTING!]';
        dhalBadge.className = 'text-yellow-300 font-bold gold-glow';
      } else if (state === 'BLOCK' || state === 'BLOCK_HIT') {
        dhalBadge.textContent = '◇ DHAL [GUARD]';
        dhalBadge.className = 'text-amber-300 font-bold';
      } else {
        dhalBadge.textContent = '◇ DHAL [READY]';
        dhalBadge.className = 'text-amber-400';
      }
    }
  }

  public updateHUD(): void {
    // Health bar & Ghost Damage Trail
    const hpPercent = Math.max(0, (this.currentHealth / this.maxHealth) * 100);
    const hpBar = document.getElementById('player-health-bar');
    const ghostBar = document.getElementById('player-health-ghost');
    const hpText = document.getElementById('player-health-text');
    
    if (hpBar) hpBar.style.width = `${hpPercent}%`;
    if (ghostBar) {
      setTimeout(() => {
        ghostBar.style.width = `${hpPercent}%`;
      }, 300);
    }
    if (hpText) hpText.textContent = `${Math.ceil(this.currentHealth)} / ${this.maxHealth}`;

    // Marma Posture bar
    const marmaPercent = Math.min(100, (this.currentMarma / this.maxMarma) * 100);
    const marmaBar = document.getElementById('player-marma-bar');
    if (marmaBar) {
      marmaBar.style.width = `${marmaPercent}%`;
      if (this.stateMachine.currentState === 'POSTURE_BROKEN') {
        marmaBar.className = 'h-full bg-red-500 animate-pulse transition-all duration-75';
      } else {
        marmaBar.className = 'h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-75';
      }
    }
  }

  public override update(dt: number): void {
    super.update(dt);
    this.updateHUD();
  }
}
