import * as THREE from 'three';
import { Boss } from './Boss';
import { Guard } from '../combat/Guard';
import type { CharacterRig, CharacterDefinition } from './animation/CharacterRig';
import { SceneManager } from '../core/SceneManager';
import { Voices } from '../combat/Voices';
import { LevelManager } from '../levels/LevelManager';

/** His laugh (public/assets/voice): as his smile spreads in the entrance, and as his second phase begins. */
const LAUGH = 'andhaka_laugh';

/** Below this share of health he enters his second phase. */
const PHASE_2_AT = 0.5;
/** His entrance clip (characters/Andhaka.ts): seated laughing, the smile, the crown, rising with the sword. */
const ENTRANCE = 'coronation';
/** The bone that carries the crown from the throne to his head (the auto-rigged model's name, then Mixamo's). */
const CROWN_HAND = ['LeftHand', 'mixamorigLeftHand'];

const smoothstep = (a: number, b: number, t: number) => THREE.MathUtils.smoothstep(t, a, b);

/**
 * Chapter V final boss, Andhaka, the asura of darkness who climbed Kailasha. He is found once his rakshasas have
 * fallen, seated on a rock on Shiva's dais, laughing; he smiles, crowns himself and rises, drawing his cleaver from the
 * stone. Heavy
 * cuts, an overhead chop, a three-blow string and a leap; below half health he roars and comes faster. Light blows
 * thrown into his swing glance off his hide (`armorDamage`): he is beaten by waiting out his blow and striking after it.
 *
 * The entrance is one authored clip whose marks say when his left hand takes the crown off the throne's arm ("lift"),
 * when it leaves his hand for his head ("crowned") and when his fist closes on the planted sword ("grip"). The crown
 * rests where his hand will take it, then rides his hand; the sword stands in the stone where his fist will close.
 * Each is placed where the clip will have it at its mark, so the hand-overs are seamless.
 */
export class BossAndhaka extends Boss {
  public phase = 1;
  private entrance: {
    marks: Record<string, number>;
    duration: number;
    hand: THREE.Object3D;
    inHand: THREE.Matrix4;
    laughed: boolean;
    lifted: boolean;
    crowned: boolean;
    gripped: boolean;
    drawn: boolean;
    roared: boolean;
  } | null = null;
  /** The face's Smile morph target on each mesh that has it. */
  private readonly smile: { mesh: THREE.Mesh; index: number }[] = [];
  private smileLevel = 0;

  constructor(id = 'andhaka') {
    super(id, 0x2a1a14, {
      attackInterval: 1.1,
      strikeRange: 3.7, // 3.15 m tall with a 1.75 m cleaver
      tooClose: 1.8,
      leapRange: 6.5,
      leapMax: 12,
      roarRange: 18,
    });
    this.displayName = 'Andhaka';
    this.epithet = 'Crowned in the eclipse';
    // Milestone 12: health 640 -> 840, blows at 130 % (was 110 %). (How many blows land decides this fight, not how hard
    // they are: 130 to 140 % made no difference to a steady player's chances, 760 and 840 health did.)
    // "Bosses fight back": his guard and a posture that starts over after a break make the fight longer and harder: health 840 -> 600.
    this.maxHealth = 600;
    this.currentHealth = 600;
    this.damageScale = 1.3; // the last fight: his blows land harder than any other's
    this.armorDamage = 0.4; // light blows thrown into his swing glance off his hide
    this.maxMarma = 200;
    // The cleaver held across him. He swings so often (every 1.1 s, 0.8 s in his second phase) that the guard can only ever be
    // short: it comes down into his next blow.
    this.guard = new Guard(this, {
      base: 0.45, perBlow: 0.3, max: 0.9, hold: 0.75, extend: 0.65, longest: 1.3, cooldown: 1.4, recovery: 0.3, window: 0.15,
      answerAfter: [2, 3], shove: 0.35, ring: 'iron',
    });
    this.moveSpeed = 4;
    this.marmaDecayRate = 8;
    this.turnRate = 4;
    this.lungeSpec = { a: 0.1, b: 0.55, maxDist: 1.6, stopDist: 2.1 };
    this.torsoMesh.scale.setScalar(1.25);
    Voices.preload([LAUGH]);
  }

  /** He laughs, `delay` seconds from now (a little later if the recording is still loading). */
  private laugh(delay = 0): void {
    const ready = Voices.get(LAUGH);
    if (ready) this.soundFX.playVoice(ready, 0, 0.3, delay);
    else void Voices.load(LAUGH).then((buffer) => buffer && this.soundFX.playVoice(buffer, 0, 0.3, delay));
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    this.smile.length = 0;
    rig.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const index = mesh.morphTargetDictionary?.Smile;
      if (index !== undefined) this.smile.push({ mesh, index });
    });
    return rig;
  }

  public override scriptedEntrance(): { duration: number; marks: Record<string, number> } | null {
    const info = this.rig?.clipInfo(ENTRANCE);
    return info?.marks ? { duration: info.duration, marks: info.marks } : null;
  }

  private crownHand(): THREE.Object3D | undefined {
    for (const name of CROWN_HAND) {
      const bone = this.rig?.root.getObjectByName(name);
      if (bone) return bone;
    }
    return undefined;
  }

  /**
   * Where one of his bones (either rig's naming) will be in the world `time` seconds into his entrance, for the
   * cutscene's framing; null without the entrance. Call before the entrance plays (it poses the rig for a moment).
   */
  public entrancePoint(bone: 'Head' | 'Hips' | 'LeftHand' | 'RightHand', time: number): THREE.Vector3 | null {
    const rig = this.rig;
    const node = rig?.root.getObjectByName(bone) ?? rig?.root.getObjectByName(`mixamorig${bone}`);
    if (!rig || !node || !rig.clipInfo(ENTRANCE)) return null;
    this.group.updateMatrixWorld(true);
    return rig.sampleAt(ENTRANCE, time, () => node.getWorldPosition(new THREE.Vector3())) ?? null;
  }

  /** The entrance: the crown on the throne's arm, the sword in the stone, and the clip from its start. */
  public override playIntro(): number {
    const rig = this.rig;
    const entrance = this.scriptedEntrance();
    const hand = this.crownHand();
    if (!rig || !entrance || !hand) return super.playIntro();
    this.hasRoared = true;
    const { marks } = entrance;
    const crown = this.shieldMesh;
    const sword = this.swordMesh;
    this.group.updateMatrixWorld(true);
    // Where the crown will be in his hand when it reaches his head; where that puts it as his hand takes it off the
    // throne; and where his fist will close on the sword.
    const inHand = rig.sampleAt(ENTRANCE, marks.crowned, () => hand.matrixWorld.clone().invert().multiply(crown.matrixWorld));
    const lift = marks.lift ?? 0;
    const resting = inHand && rig.sampleAt(ENTRANCE, lift, () => this.group.matrixWorld.clone().invert().multiply(hand.matrixWorld).multiply(inHand));
    const planted = rig.sampleAt(ENTRANCE, marks.grip, () => this.group.matrixWorld.clone().invert().multiply(sword.matrixWorld));
    if (!inHand || !resting || !planted) return super.playIntro();
    if (lift > 0) place(crown, this.group, resting);
    else place(crown, hand, inHand);
    if (marks.grip > 0) place(sword, this.group, planted);
    this.stateMachine.changeState('IDLE');
    this.playScripted({ clip: ENTRANCE, fade: 0 });
    this.entrance = {
      marks, duration: entrance.duration, hand, inHand,
      laughed: false, lifted: lift <= 0, crowned: false, gripped: marks.grip <= 0, drawn: false, roared: false,
    };
    return entrance.duration;
  }

  public override settleIntro(): void {
    super.settleIntro();
    this.finishEntrance();
    // However his entrance went (skipped, cut short, or none), he fights crowned, under a burning beacon.
    LevelManager.getInstance().activeLevel?.cue?.('crowned-settled');
  }

  /** Crown on his head, sword in his hand, on guard (the entrance is over, or was cut short). */
  private finishEntrance(): void {
    const e = this.entrance;
    if (!e) return;
    this.entrance = null;
    const def = this.rig?.definition;
    if (def?.offhand) this.rig!.attach(this.shieldMesh, def.offhand);
    if (def?.weapon) this.rig!.attach(this.swordMesh, def.weapon);
    this.onGuard = true; // his stance, not the calm idle, until the fight starts (the over-the-shoulder shot)
    this.stateMachine.changeState('IDLE'); // re-enters IDLE: his stance takes over from the clip
  }

  public override update(dt: number): void {
    super.update(dt);
    const e = this.entrance;
    const rig = this.rig;
    if (e && rig) {
      // Another state took over (he was hit, say): the entrance is done with. The clip's last frame can fall a hair
      // short of its nominal length.
      const playing = rig.clip === ENTRANCE && this.stateMachine.currentState === 'IDLE';
      const t = playing ? rig.time : e.duration;
      const def = rig.definition;
      if (!e.laughed && playing && e.marks.smile !== undefined && t >= e.marks.smile) {
        e.laughed = true;
        this.laugh();
      }
      if (!e.lifted && t >= e.marks.lift) {
        e.lifted = true;
        place(this.shieldMesh, e.hand, e.inHand);
      }
      if (!e.crowned && t >= e.marks.crowned && def.offhand) {
        e.crowned = true;
        rig.attach(this.shieldMesh, def.offhand);
        // The crown settles: the place answers (the summit lights its beacon).
        LevelManager.getInstance().activeLevel?.cue?.('crowned');
      }
      if (!e.gripped && t >= e.marks.grip && def.weapon) {
        e.gripped = true;
        rig.attach(this.swordMesh, def.weapon);
      }
      if (!e.drawn && t >= e.marks.drawn) {
        e.drawn = true;
        // Stone gives up the blade.
        const tip = this.getWeaponPoints().tip.setY(this.getPosition().y);
        this.particleFX.spawnDustPuff(tip, 26);
        this.soundFX.playParryClash();
      }
      if (!e.roared && e.marks.roar !== undefined && t >= e.marks.roar) {
        e.roared = true;
        // From the roar he stays in his fighting stance (not the calm idle at ease) until the fight starts.
        this.onGuard = true;
        this.onRoar();
      }
      if (t >= e.duration - 1 / 30) this.finishEntrance();
    }
    this.updateSmile(dt);
  }

  /** The smile spreads as he laughs and stays through his crowning; as he rises it eases to a smirk that never leaves. */
  private updateSmile(dt: number): void {
    const e = this.entrance;
    const rig = this.rig;
    let target = 0.2;
    if (e && rig?.clip === ENTRANCE) {
      const t = rig.time;
      const rise = e.marks.rise ?? e.marks.grip;
      target = smoothstep(e.marks.smile, e.marks.smile + 0.9, t) * (1 - 0.5 * smoothstep(rise, rise + 1.2, t));
    } else if (this.stateMachine.currentState === 'DEAD') {
      target = 0;
    }
    this.smileLevel += (target - this.smileLevel) * Math.min(1, dt * 6);
    for (const s of this.smile) s.mesh.morphTargetInfluences![s.index] = this.smileLevel;
  }

  /**
   * Committed from his wind-up until his last blow has fallen; after it he is open (trading blows with him loses,
   * punishing his recovery pays).
   */
  public override isArmored(): boolean {
    const state = this.stateMachine.currentState;
    if (!state.startsWith('ATTACK')) return super.isArmored();
    const last = this.hitWindows(state).at(-1);
    return !last || this.stateMachine.stateTime <= last.t1;
  }

  public override takeDamage(amount: number): void {
    super.takeDamage(amount);
    if (this.phase === 1 && this.currentHealth > 0 && this.currentHealth <= this.maxHealth * PHASE_2_AT) this.enterPhase2();
  }

  /** He roars (CHARGE), the stone shakes, and he swings sooner and turns faster. */
  private enterPhase2(): void {
    this.phase = 2;
    this.tuning = { ...this.tuning, attackInterval: 0.8 };
    this.turnRate = 5;
    this.soundFX.playBossPhaseTransition();
    this.laugh(0.6); // over the surge's tail
    this.particleFX.spawnDeflectionShockwave(this.getPosition());
    SceneManager.getInstance().quake(this.getPosition());
    if (this.hasClip('CHARGE') && this.stateMachine.currentState !== 'POSTURE_BROKEN') this.stateMachine.changeState('CHARGE');
  }

  protected override onRoar(): void {
    this.soundFX.playRoar(0.7);
    this.particleFX.spawnDustPuff(this.getPosition(), 28);
  }
}

/** Parents `obj` to `parent` with `local` (a matrix in the parent's space) as its transform. */
function place(obj: THREE.Object3D, parent: THREE.Object3D, local: THREE.Matrix4): void {
  parent.add(obj);
  local.decompose(obj.position, obj.quaternion, obj.scale);
}
