import { Player } from '../entities/Player';
import { Character, wrapAngle } from '../entities/Character';
import { InputManager } from '../core/InputManager';
import type { CharacterState } from '../entities/CharacterStateMachine';

/**
 * A received hero wears exactly the local hero's rig and weapon. It has no physics motor and never reads the
 * keyboard: positions already resolved by the owner's Rapier world are authoritative. A bounded snapshot queue
 * draws it 100 ms behind receipt time, blending position and yaw along the short arc. State and clip time travel
 * together, including an attack serial so consecutive identical swings are not mistaken for one long swing.
 * There is no rollback, clock agreement or attempt to replay the remote player's non-deterministic simulation.
 */
export interface HeroSnapshot {
  loadout: string;
  seq: number;
  tick: number;
  position: [number, number, number];
  velocity: [number, number, number];
  yaw: number;
  state: CharacterState;
  time: number;
  swing: number;
  health: number;
  posture: number;
  charged: number;
}
export const DUEL_INTERPOLATION_MS = 100;

export class RemoteHero extends Player {
  private readonly snapshots: { at: number; state: HeroSnapshot }[] = [];
  public snapshot: HeroSnapshot | null = null;

  constructor(id = 'duel_opponent') {
    super(id, InputManager.isolated());
  }

  public receive(state: HeroSnapshot, at = performance.now()): void {
    if (state.seq <= (this.snapshots.at(-1)?.state.seq ?? -1)) return;
    this.snapshots.push({ at, state });
    if (this.snapshots.length > 32) this.snapshots.shift();
  }

  public clearSnapshots(): void {
    this.snapshots.length = 0;
    this.snapshot = null;
    this.receivedAttackId = null;
  }

  public override update(dt: number): void {
    if (!this.snapshots.length) return;
    const now = performance.now() - DUEL_INTERPOLATION_MS;
    while (this.snapshots.length > 2 && this.snapshots[1].at <= now) this.snapshots.shift();
    const a = this.snapshots[0];
    const b = this.snapshots[1] ?? a;
    const k = Math.max(0, Math.min(1, (now - a.at) / Math.max(1, b.at - a.at)));
    const state = k >= 1 ? b.state : a.state;
    const time = a.state.state === b.state.state && a.state.swing === b.state.swing
      ? a.state.time + (b.state.time - a.state.time) * k : state.time;
    const sm = this.stateMachine;
    if (sm.currentState !== state.state || this.snapshot?.swing !== state.swing) {
      sm.reset();
      sm.changeState(state.state);
    }
    this.receivedAttackId = state.swing;
    sm.stateTime = Math.max(0, time - dt);
    sm.isParryActive = state.state === 'PARRY' && time <= sm.parryWindow;
    this.currentHealth = Math.min(this.currentHealth, state.health);
    this.currentMarma = state.posture;
    this.chargedHits = state.charged;
    this.visSpeed = Math.hypot(state.velocity[0], state.velocity[2]);
    // Character advances the same rig and trails; discard root motion and knockback after posing it.
    Character.prototype.update.call(this, dt);
    // Attack and defence clips follow the received state clock, including the owner's hit-stop. Locomotion keeps
    // its speed-matched loop. Sampling again at zero delta poses the bones without replaying root motion.
    if (this.rig && !['IDLE', 'REST', 'WALK', 'MOVE', 'SPRINT'].includes(state.state)) {
      const config = this.rig.definition.states[state.state];
      this.rig.seek((config?.startAt ?? 0) + time * (config?.timeScale ?? 1));
      this.rig.update(0, this.visSpeed);
    }
    this.group.position.set(...a.state.position).lerp({
      x: b.state.position[0], y: b.state.position[1], z: b.state.position[2],
    }, k);
    this.group.rotation.y = a.state.yaw + wrapAngle(b.state.yaw - a.state.yaw) * k;
    sm.currentState = state.state;
    sm.stateTime = time;
    this.snapshot = state;
  }
}
