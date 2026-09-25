import * as THREE from 'three';
import { Character } from './Character';
import { InputManager } from '../core/InputManager';
import { SoundFX } from '../combat/SoundFX';
import { ParticleFX } from '../combat/ParticleFX';

export class Player extends Character {
  private inputManager: InputManager;
  private soundFX: SoundFX;
  private particleFX: ParticleFX;
  public cameraYaw: number = 0;

  constructor() {
    super('player_hero', 0xd4af37); // Royal Gold

    this.inputManager = InputManager.getInstance();
    this.soundFX = SoundFX.getInstance();
    this.particleFX = ParticleFX.getInstance();

    // Setup state change hooks
    this.stateMachine.onStateChanged = (newState) => {
      this.updateHudBadge(newState);

      if (newState === 'ATTACK_1' || newState === 'ATTACK_2' || newState === 'ATTACK_3') {
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
    const currentState = this.stateMachine.currentState;

    // Don't allow new actions during locked states
    if (currentState === 'POSTURE_BROKEN' || currentState === 'DEAD') {
      return;
    }

    // 1. Parry Trigger (Right Click)
    if (input.parry && (currentState === 'IDLE' || currentState === 'MOVE' || currentState === 'SPRINT')) {
      this.stateMachine.changeState('PARRY');
      return;
    }

    // 2. Attack Trigger (Left Click) & Combo Chaining
    if (input.attack) {
      if (currentState === 'IDLE' || currentState === 'MOVE' || currentState === 'SPRINT') {
        this.stateMachine.changeState('ATTACK_1');
        return;
      } else if (
        (currentState === 'ATTACK_1' || currentState === 'ATTACK_2') &&
        this.stateMachine.comboWindowOpen
      ) {
        this.stateMachine.comboQueued = true;
      }
    }

    // 3. Dodge Roll Trigger (Space)
    if (input.dodge && (currentState === 'IDLE' || currentState === 'MOVE' || currentState === 'SPRINT' || currentState === 'ATTACK_1' || currentState === 'ATTACK_2')) {
      // Calculate dodge roll direction from input or forward
      const moveVec = this.calculateInputDirection(input);
      if (moveVec.lengthSq() > 0.001) {
        this.dodgeDirection.copy(moveVec).normalize();
      } else {
        // Default to facing direction
        this.group.getWorldDirection(this.dodgeDirection);
      }
      this.stateMachine.changeState('DODGE_ROLL');
      return;
    }

    // 4. Movement handling
    let moveMagnitude = 0;
    if (currentState === 'IDLE' || currentState === 'MOVE' || currentState === 'SPRINT') {
      const moveVec = this.calculateInputDirection(input);
      moveMagnitude = moveVec.length();

      if (moveMagnitude > 0.01) {
        const isSprinting = input.sprint;
        const targetState = isSprinting ? 'SPRINT' : 'MOVE';
        if (currentState !== targetState) {
          this.stateMachine.changeState(targetState);
        }

        const speed = isSprinting ? this.sprintSpeed : this.moveSpeed;
        const step = moveVec.clone().multiplyScalar(speed * dt);
        
        this.group.position.add(step);
        if (this.rigidBody) {
          this.rigidBody.setTranslation(
            { x: this.group.position.x, y: this.group.position.y, z: this.group.position.z },
            true
          );
        }

        // Rotate character towards movement direction smoothly
        const targetRotationY = Math.atan2(moveVec.x, moveVec.z);
        let diff = targetRotationY - this.group.rotation.y;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        this.group.rotation.y += diff * Math.min(1.0, this.rotationSpeed * dt);
      } else {
        if (currentState !== 'IDLE') {
          this.stateMachine.changeState('IDLE');
        }
      }
    } else if (currentState === 'DODGE_ROLL') {
      // Move in dodge direction
      const step = this.dodgeDirection.clone().multiplyScalar(this.dodgeSpeed * dt);
      this.group.position.add(step);
      if (this.rigidBody) {
        this.rigidBody.setTranslation(
          { x: this.group.position.x, y: this.group.position.y, z: this.group.position.z },
          true
        );
      }

      // Rotate towards dodge direction
      const targetRotationY = Math.atan2(this.dodgeDirection.x, this.dodgeDirection.z);
      this.group.rotation.y = targetRotationY;
    } else if (currentState.startsWith('ATTACK')) {
      // Subtle forward lunge during attacks
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      const lungeSpeed = currentState === 'ATTACK_3' ? 3.5 : 1.8;
      const step = forward.multiplyScalar(lungeSpeed * dt);
      this.group.position.add(step);
      if (this.rigidBody) {
        this.rigidBody.setTranslation(
          { x: this.group.position.x, y: this.group.position.y, z: this.group.position.z },
          true
        );
      }
    }

    this.updateProceduralAnimations(dt, moveMagnitude);
  }

  private calculateInputDirection(input: ReturnType<InputManager['getState']>): THREE.Vector3 {
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
      badge.textContent = state.replace('_', ' ');
      if (state === 'PARRY') {
        badge.className = 'px-2 py-0.5 rounded bg-yellow-400 text-zinc-950 font-bold font-mono text-[10px] animate-pulse';
      } else if (state.startsWith('ATTACK')) {
        badge.className = 'px-2 py-0.5 rounded bg-red-700 text-white font-bold font-mono text-[10px]';
      } else if (state === 'DODGE_ROLL') {
        badge.className = 'px-2 py-0.5 rounded bg-blue-600 text-white font-bold font-mono text-[10px]';
      } else {
        badge.className = 'px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] uppercase';
      }
    }

    const dhalBadge = document.getElementById('badge-parry');
    if (dhalBadge) {
      if (state === 'PARRY') {
        dhalBadge.textContent = 'DEFLECTING!';
        dhalBadge.className = 'px-2 py-0.5 rounded bg-yellow-500 text-zinc-950 font-black border border-yellow-300 parry-flash-active';
      } else {
        dhalBadge.textContent = 'DHAL READY';
        dhalBadge.className = 'px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30';
      }
    }
  }

  public updateHUD(): void {
    // Health bar
    const hpPercent = (this.currentHealth / this.maxHealth) * 100;
    const hpBar = document.getElementById('player-health-bar');
    const hpText = document.getElementById('player-health-text');
    if (hpBar) hpBar.style.width = `${hpPercent}%`;
    if (hpText) hpText.textContent = `${Math.ceil(this.currentHealth)} / ${this.maxHealth}`;

    // Marma Posture bar
    const marmaPercent = (this.currentMarma / this.maxMarma) * 100;
    const marmaBar = document.getElementById('player-marma-bar');
    const marmaText = document.getElementById('player-marma-text');
    if (marmaBar) {
      marmaBar.style.width = `${marmaPercent}%`;
      if (this.stateMachine.currentState === 'POSTURE_BROKEN') {
        marmaBar.className = 'h-full bg-red-600 animate-pulse transition-all duration-100';
      } else {
        marmaBar.className = 'h-full bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 transition-all duration-100';
      }
    }
    if (marmaText) {
      if (this.stateMachine.currentState === 'POSTURE_BROKEN') {
        marmaText.textContent = 'BROKEN!';
      } else {
        marmaText.textContent = `${Math.ceil(this.currentMarma)} / ${this.maxMarma}`;
      }
    }
  }

  public override update(dt: number): void {
    super.update(dt);
    this.updateHUD();
  }
}
