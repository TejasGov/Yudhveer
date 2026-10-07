import * as THREE from 'three';
import { Boss } from './Boss';
import { Guard } from '../combat/Guard';
import type { CharacterRig, CharacterDefinition } from './animation/CharacterRig';
import { SceneManager } from '../core/SceneManager';
import { Voices } from '../combat/Voices';
import { Enemy, type FightTarget } from './Enemy';
import type { CharacterState } from './CharacterStateMachine';
import { burnAway, charged, grade } from '../cinematics/Entrance';
import { LevelManager } from '../levels/LevelManager';
import { ANDHAKA_THRONE } from '../levels/Level4_Summit';

/** His laugh (public/assets/voice): as his smile spreads in the entrance, and as his second phase begins. */
const LAUGH = 'andhaka_laugh';

/** Below this share of health he enters his second phase. */
const PHASE_2_AT = 0.5;
/**
 * His second phase (the user, 2026-10-07): he does not fight it himself at first. He brings out variants of himself and
 * walks back up Shiva's stair to his throne, and sits, laughing, out of reach (no blow touches him there) while they
 * fight for him; there he recovers (`THRONE_WAY.recoverTo`). Up to `most` stand at once, `total` in all: the first
 * `most` together as he turns away (`apart` seconds between them), then one more `replaceAfter` seconds after each
 * falls, until all are spent. They come up in a ring round the hero (`ring` metres off: flanking him, then at his
 * back). When the last is down he stands up off the throne and fights again. They go with him if he falls.
 */
const VARIANTS = { most: 3, total: 6, apart: 0.55, replaceAfter: 2.0, ring: 4.6 };
/**
 * His way back up to the throne: the foot of the stair, its top on the dais (Level4_Summit: the stair runs straight up the
 * middle, x 0, from z 1 to z -8.5), then the seat (`ANDHAKA_THRONE`). If anything holds him on the way he is put on the
 * throne after `giveUp` seconds. Seated, he laughs for `laughFor` seconds, and recovers `recoverRate` of his whole
 * health a second, up to `recoverTo` (he went up at half).
 */
const THRONE_WAY = {
  path: [new THREE.Vector3(0, 0, 1.6), new THREE.Vector3(0, 4.0, -8.6)],
  speed: 3.4,
  giveUp: 9,
  laughFor: 3.0,
  recoverTo: 0.75,
  recoverRate: 0.035,
};
/** Andhaka's ember: his variants are made of it, and burn back into it. */
const EMBER = 0xff5a1a;
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
  /** The variants of himself he has brought out (living or not), and the time until he may bring another. */
  private readonly variants: AndhakaVariant[] = [];
  private variantCount = 0;
  /**
   * Withdrawn to his throne while his variants fight (his second phase): walking up to it, seated on it, or rising
   * off it to fight again; null when he is fighting. `back`: he has risen, and will not withdraw again.
   */
  private withdrawn: { phase: 'walking' | 'seated' | 'rising'; t: number; leg: number } | null = null;
  private back = false;
  /** Variants about to come out: fight seconds until each. */
  private readonly variantsDue: number[] = [];
  private foe: FightTarget | null = null;
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
    // "Bosses fight back": a posture that starts over after a break makes him a good deal harder to keep down: health 840 -> 720 (a
    // steady player still loses three fights in ten).
    this.maxHealth = 720;
    this.currentHealth = 720;
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

  /**
   * He laughs, `delay` seconds from now (a little later if the recording is still loading), and the laugh comes back
   * off the mountains around the summit, again and again, dying away.
   */
  private laugh(delay = 0): void {
    const ready = Voices.get(LAUGH);
    if (ready) this.soundFX.playVoiceEcho(ready, 0.3, delay);
    else void Voices.load(LAUGH).then((buffer) => buffer && this.soundFX.playVoiceEcho(buffer, 0.3, delay));
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
    // However his entrance went (skipped, cut short, or none), he fights crowned, under a burning beacon, in colour.
    LevelManager.getInstance().activeLevel?.cue?.('crowned-settled');
    grade(0, 0);
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
  /** In the fight: committed from his wind-up until his last blow has fallen (see the note above). */
  private isArmoredInFight(): boolean {
    const state = this.stateMachine.currentState;
    if (!state.startsWith('ATTACK')) return super.isArmored();
    const last = this.hitWindows(state).at(-1);
    return !last || this.stateMachine.stateTime <= last.t1;
  }

  public override takeDamage(amount: number): void {
    // Withdrawn to his throne: out of reach of blows.
    if (this.withdrawn) return;
    super.takeDamage(amount);
    if (this.phase === 1 && this.currentHealth > 0 && this.currentHealth <= this.maxHealth * PHASE_2_AT) this.enterPhase2();
  }

  /** He roars (CHARGE), the stone shakes, and he swings sooner and turns faster; then his variants come. */
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

  public override updateAI(dt: number, target: FightTarget): void {
    this.foe = target;
    const state = this.stateMachine.currentState;
    // Into his second phase (once his roar is over): he brings out his variants and goes back up to his throne.
    if (this.phase === 2 && !this.withdrawn && !this.back && state !== 'DEAD' && state !== 'CHARGE' && state !== 'POSTURE_BROKEN') this.withdraw();
    if (this.withdrawn && state !== 'DEAD') {
      this.updateWithdrawal(dt);
      this.updateVariants(dt);
      return;
    }
    super.updateAI(dt, target);
  }

  /** He turns from the boy as his variants come up out of ember round him, laughing, and makes for the stair. */
  private withdraw(): void {
    this.withdrawn = { phase: 'walking', t: 0, leg: 0 };
    for (let i = 0; i < VARIANTS.most; i++) this.variantsDue.push(0.2 + i * VARIANTS.apart);
    this.laugh(0.3);
  }

  /** Keeps up to `most` of them standing, `total` in all, one more a moment after each falls. */
  private updateVariants(dt: number): void {
    const standing = this.variants.filter((v) => v.stateMachine.currentState !== 'DEAD').length;
    if (standing + this.variantsDue.length < VARIANTS.most && this.variantCount + this.variantsDue.length < VARIANTS.total) {
      this.variantsDue.push(VARIANTS.replaceAfter);
    }
    for (let i = this.variantsDue.length - 1; i >= 0; i--) {
      this.variantsDue[i] -= dt;
      if (this.variantsDue[i] > 0) continue;
      this.variantsDue.splice(i, 1);
      this.bringOutVariant();
    }
  }

  /** Up the stair to the throne, sitting on it, or rising off it. */
  private updateWithdrawal(dt: number): void {
    const w = this.withdrawn!;
    w.t += dt;
    if (w.phase === 'walking') {
      const to = THRONE_WAY.path[Math.min(w.leg, THRONE_WAY.path.length - 1)];
      const dir = to.clone().sub(this.getPosition()).setY(0);
      if (dir.length() < 0.7) w.leg++;
      if (w.leg >= THRONE_WAY.path.length || w.t >= THRONE_WAY.giveUp) {
        this.sitOnThrone();
        return;
      }
      this.steer(dir.normalize(), THRONE_WAY.speed, dt);
      this.settle('MOVE');
      this.updateProceduralAnimations(dt, 1);
      return;
    }
    // On the throne (seated, or rising off it): held on his seat, nothing carrying him off it (his walk's way, a shove).
    this.velocity.set(0, 0, 0);
    this.group.position.set(ANDHAKA_THRONE.x, this.group.position.y, ANDHAKA_THRONE.z);
    if (w.phase === 'seated') {
      // Laughing as he sits, then at ease on the throne, recovering, his ember stirring on him now and then.
      if (this.rig?.clip === 'sitting_laughing' && w.t >= THRONE_WAY.laughFor) this.playClip('sitting_idle', { fade: 0.5 });
      const top = this.maxHealth * THRONE_WAY.recoverTo;
      if (this.currentHealth < top) this.currentHealth = Math.min(top, this.currentHealth + this.maxHealth * THRONE_WAY.recoverRate * dt);
      this.currentMarma = Math.max(0, this.currentMarma - this.maxMarma * dt);
      if (Math.random() < dt * 0.6) charged(this, 0.5, { color: new THREE.Color(3.2, 1.0, 0.3), arcs: 2, width: 0.035, rate: 10 });
      const spent = this.variantCount >= VARIANTS.total && this.variantsDue.length === 0;
      if (spent && this.variants.every((v) => v.stateMachine.currentState === 'DEAD')) this.riseFromThrone();
      return;
    }
    // Rising off the throne with the cleaver; then the fight again.
    if (w.t >= 2.1) {
      this.withdrawn = null;
      this.back = true;
      this.settle('IDLE');
      this.soundFX.playRoar(0.7);
      SceneManager.getInstance().quake(this.getPosition());
    }
  }

  /** On the throne, facing down the stair, laughing. */
  private sitOnThrone(): void {
    this.withdrawn = { phase: 'seated', t: 0, leg: 0 };
    this.setPosition(ANDHAKA_THRONE.x, ANDHAKA_THRONE.y, ANDHAKA_THRONE.z);
    this.faceYaw(0);
    this.settle('IDLE');
    this.playClip('sitting_laughing', { fade: 0.35 });
    this.laugh(0.2);
  }

  /** The last of them is down: recovered, he stands up off the throne to fight again. */
  private riseFromThrone(): void {
    this.withdrawn = { phase: 'rising', t: 0, leg: 0 };
    this.playClip('sit_to_stand', { fade: 0.3 });
    this.particleFX.spawnFlames(this.getPosition(), 50, 1.2);
    charged(this, 1.8, { color: new THREE.Color(3.2, 1.0, 0.3), arcs: 6, width: 0.05, rate: 20 });
    this.laugh(0.6);
  }

  /** Withdrawn to his throne, no blow touches him (the variants are the fight then). */
  public override isArmored(): boolean {
    return !!this.withdrawn || this.isArmoredInFight();
  }

  public override addMarmaDamage(amount: number): boolean {
    if (this.withdrawn) return false;
    return super.addMarmaDamage(amount);
  }

  /** One variant of himself, out of ember in the ring round the hero: flanking him, then at his back. */
  private bringOutVariant(): void {
    const foe = this.foe;
    if (!this.onSummon || !foe || this.stateMachine.currentState === 'DEAD' || foe.isDown()) return;
    const k = this.variantCount++;
    const hero = foe.getPosition();
    const toMe = this.getPosition().sub(hero).setY(0);
    if (toMe.lengthSq() < 1e-4) toMe.set(0, 0, -1);
    toMe.normalize();
    const angle = [70, -70, 180][k % 3] * (Math.PI / 180) + (k >= 3 ? (Math.random() - 0.5) * 0.8 : 0);
    const at = hero.clone().addScaledVector(toMe.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle), VARIANTS.ring);
    this.onSummon({
      make: () => {
        const v = new AndhakaVariant(`${this.id}_variant_${k}`);
        this.variants.push(v);
        return v;
      },
      at,
      onReady: (v) => (v as AndhakaVariant).emerge(),
    });
  }

  protected override onStateChange(state: CharacterState, previous: CharacterState): void {
    super.onStateChange(state, previous);
    // He falls, and what he made of himself goes with him.
    if (state === 'DEAD') for (const v of this.variants) v.unmade();
  }
}

/**
 * A variant of Andhaka (his second phase): his own body over again, darkened and smouldering, made of his ember. Weaker
 * than he is (a few blows put it down, its own blows land lighter, it swings less often) and no boss: it has his
 * plainer blows only. Killed, or unmade when he falls, it burns back into ember and is gone.
 */
export class AndhakaVariant extends Enemy {
  constructor(id: string) {
    super(id, 0x1a0a08);
    this.displayName = 'Andhaka';
    this.maxHealth = 70;
    this.currentHealth = 70;
    this.maxMarma = 50;
    this.damageScale = 0.73; // half of his: 16 x 0.73 = 11.7, against his 18 x 1.3 = 23.4
    this.moveSpeed = 3.6;
    this.attackCooldown = 2.0;
    this.telegraphDuration = 0.55;
    this.engageRange = 3.3;
    this.turnRate = 4.5;
    this.attackStates = ['ATTACK_1', 'ATTACK_2'];
  }

  public override async attachRig(definition: CharacterDefinition): Promise<CharacterRig> {
    const rig = await super.attachRig(definition);
    // His own materials are shared by every copy of his model: this one's are its own, darkened to smoulder.
    rig.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = ([] as THREE.Material[]).concat(mesh.material).map((m) => {
        const c = m.clone() as THREE.MeshStandardMaterial;
        c.color?.multiplyScalar(0.3);
        // His own ember (the cracks in his hide) kept, dimmed: the emissive colour lights its whole map.
        if (c.emissive) c.emissive.multiplyScalar(0.7);
        return c;
      });
      mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
    });
    return rig;
  }

  /** It comes up out of ember: fire round its feet, a shock off the stone, ember crawling on it. */
  public emerge(): void {
    this.particleFX.spawnFlames(this.getPosition(), 40, 0.9);
    this.particleFX.spawnDeflectionShockwave(this.getPosition(), undefined, true);
    this.soundFX.playFlameBurst();
    charged(this, 1.4, { color: new THREE.Color(3.2, 1.0, 0.3), arcs: 4, width: 0.05, rate: 16 });
  }

  /** Andhaka has fallen: it goes with him. */
  public unmade(): void {
    if (this.stateMachine.currentState === 'DEAD') return;
    this.currentHealth = 0;
    this.stateMachine.changeState('DEAD');
  }

  protected override onStateChange(state: CharacterState, previous: CharacterState): void {
    super.onStateChange(state, previous);
    if (state === 'DEAD') burnAway(this, EMBER, 1.3);
  }
}

/** Parents `obj` to `parent` with `local` (a matrix in the parent's space) as its transform. */
function place(obj: THREE.Object3D, parent: THREE.Object3D, local: THREE.Matrix4): void {
  parent.add(obj);
  local.decompose(obj.position, obj.quaternion, obj.scale);
}
