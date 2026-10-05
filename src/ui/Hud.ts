import * as THREE from 'three';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import type { Callout } from '../combat/CombatSystem';
import type { InputDevice } from '../core/InputManager';
import { refreshGlyphs, withGlyphs } from './Glyphs';

const $ = (id: string) => document.getElementById(id)!;
/** Damage shows as a pale ghost on the bar for this long before draining away. */
const GHOST_HOLD = 0.45;
const GHOST_DRAIN = 0.7; // share of the bar per second
/** Ordinary enemies' plates show within this distance. */
const PLATE_RANGE = 22;
/** A blow to the hero this hard (a boss's swing; a minion's is 16) pulses blood at the screen's edge. */
const HARD_BLOW = 18;
/** The posture-break prompt shows while a broken enemy is this close. */
const PROMPT_RANGE = 5;

/** A bar drawn with scaleX, written only when its value changes, with an optional damage ghost. */
class Bar {
  private shown = -1;
  private ghost = 1;
  private ghostShown = -1;
  private hold = 0;

  constructor(private readonly fill: HTMLElement, private readonly ghostEl: HTMLElement | null = null) {}

  public set(value: number, dt: number): void {
    const v = THREE.MathUtils.clamp(value, 0, 1);
    if (Math.abs(v - this.shown) > 0.001) {
      this.fill.style.transform = `scaleX(${v.toFixed(4)})`;
      this.shown = v;
    }
    if (!this.ghostEl) return;
    if (v >= this.ghost) {
      this.ghost = v;
      this.hold = GHOST_HOLD;
    } else if (this.hold > 0) {
      this.hold -= dt;
    } else {
      this.ghost = Math.max(v, this.ghost - GHOST_DRAIN * dt);
    }
    if (Math.abs(this.ghost - this.ghostShown) > 0.001) {
      this.ghostEl.style.transform = `scaleX(${this.ghost.toFixed(4)})`;
      this.ghostShown = this.ghost;
    }
  }

  public reset(value = 1): void {
    this.ghost = value;
    this.hold = 0;
    this.set(value, 0);
  }

  public set broken(on: boolean) {
    this.fill.classList.toggle('broken', on);
  }
}

interface Plate {
  el: HTMLElement;
  health: Bar;
  posture: Bar;
  visible: boolean;
}

/** The in-play HUD: the hero's bars, the boss bar, small bars over other enemies, callouts and hints. */
export class Hud {
  private readonly root = $('hud');
  private readonly playerHealth = new Bar($('player-health'), $('player-ghost'));
  private readonly playerPosture = new Bar($('player-posture'));
  private readonly bossHealth = new Bar($('boss-health'), $('boss-ghost'));
  private readonly bossPosture = new Bar($('boss-posture'));
  private readonly bossStatus = $('boss-status');
  private readonly shaktiPips = [...$('shakti').querySelectorAll('i')];
  private readonly plates = new Map<string, Plate>();
  private readonly platesRoot = $('enemy-plates');
  private readonly calloutEl = $('callout');
  private readonly marmaPrompt = $('marma-prompt');
  private readonly hintEl = $('hint');
  private readonly hurtEl = $('hurt-vignette');
  private readonly bloodEl = $('blood-pulse');
  private pulse: Animation | null = null;
  private boss: Enemy | null = null;
  private calloutTimer = 0;
  private hintTimer = 0;
  private shakti = -1;
  private readonly projected = new THREE.Vector3();
  public device: InputDevice = 'keyboard';

  public show(on: boolean): void {
    this.root.hidden = !on;
  }

  /** A new fight: bars full, plates rebuilt for these enemies, the boss (if any) on the big bar. */
  public bind(enemies: Enemy[]): void {
    this.platesRoot.replaceChildren();
    this.plates.clear();
    this.boss = null;
    this.bossStatus.hidden = true;
    enemies.forEach((e) => this.add(e));
    this.playerHealth.reset(1);
    this.playerPosture.reset(0);
  }

  /** An enemy joins the fight (also mid-fight: a wave, a boss arriving). Bosses take the big bar. */
  public add(enemy: Enemy): void {
    if (enemy.isBoss) {
      this.boss = enemy;
      $('boss-name').textContent = enemy.displayName;
      $('boss-epithet').textContent = enemy.epithet;
      this.bossHealth.reset(1);
      this.bossPosture.reset(0);
      return;
    }
    const el = document.createElement('div');
    el.className = 'plate';
    el.style.opacity = '0';
    el.innerHTML = `<div class="plate-name"></div><div class="bar"><div class="bar-fill"></div></div><div class="bar bar-posture"><div class="bar-fill"></div></div>`;
    el.querySelector('.plate-name')!.textContent = enemy.displayName;
    const fills = el.querySelectorAll<HTMLElement>('.bar-fill');
    const plate = { el, health: new Bar(fills[0]), posture: new Bar(fills[1]), visible: false };
    plate.health.reset(1);
    plate.posture.reset(0);
    this.platesRoot.appendChild(el);
    this.plates.set(enemy.id, plate);
  }

  /** Reveals the boss bar (after its cutscene). */
  public showBoss(on: boolean): void {
    this.bossStatus.hidden = !on || !this.boss;
  }

  public setDevice(device: InputDevice): void {
    this.device = device;
    refreshGlyphs(document, device);
  }

  public update(player: Player, enemies: Enemy[], camera: THREE.PerspectiveCamera, dt: number): void {
    this.playerHealth.set(player.currentHealth / player.maxHealth, dt);
    this.playerPosture.set(player.currentMarma / player.maxMarma, dt);
    this.playerPosture.broken = player.stateMachine.currentState === 'POSTURE_BROKEN';
    if (player.chargedHits !== this.shakti) {
      this.shakti = player.chargedHits;
      this.shaktiPips.forEach((pip, i) => pip.classList.toggle('lit', i < player.chargedHits));
    }

    if (this.boss) {
      this.bossHealth.set(this.boss.currentHealth / this.boss.maxHealth, dt);
      this.bossPosture.set(this.boss.currentMarma / this.boss.maxMarma, dt);
      this.bossPosture.broken = this.boss.stateMachine.currentState === 'POSTURE_BROKEN';
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    let prompt = false;
    for (const enemy of enemies) {
      const state = enemy.stateMachine.currentState;
      const near = enemy.getPosition().distanceTo(player.getPosition());
      if (state === 'POSTURE_BROKEN' && near < PROMPT_RANGE) prompt = true;
      const plate = this.plates.get(enemy.id);
      if (!plate) continue;
      plate.health.set(enemy.currentHealth / enemy.maxHealth, dt);
      plate.posture.set(enemy.currentMarma / enemy.maxMarma, dt);
      plate.posture.broken = state === 'POSTURE_BROKEN';
      this.projected.copy(enemy.getPosition()).setY(enemy.getPosition().y + enemy.visualHeight() + 0.35).project(camera);
      const onScreen = this.projected.z < 1 && Math.abs(this.projected.x) < 1.1 && Math.abs(this.projected.y) < 1.1;
      // Someone still waiting out of sight for the story to bring them on has no plate yet.
      const visible = state !== 'DEAD' && enemy.group.visible && onScreen && near < PLATE_RANGE;
      if (visible) {
        const x = (this.projected.x * 0.5 + 0.5) * w;
        const y = (-this.projected.y * 0.5 + 0.5) * h;
        plate.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      }
      if (visible !== plate.visible) {
        plate.visible = visible;
        plate.el.style.opacity = visible ? '1' : '0';
      }
    }
    if (prompt === this.marmaPrompt.hidden) this.marmaPrompt.hidden = !prompt;

    if (this.calloutTimer > 0) {
      this.calloutTimer -= dt;
      if (this.calloutTimer <= 0) this.calloutEl.classList.remove('show');
    }
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.hintEl.classList.remove('show');
    }
  }

  public callout(c: Callout): void {
    const text = $('callout-text');
    text.textContent = c.text;
    text.className = c.tone;
    $('callout-sub').textContent = c.sub ?? '';
    this.calloutEl.classList.remove('show');
    void this.calloutEl.offsetWidth; // restart the animation
    this.calloutEl.classList.add('show');
    this.calloutTimer = 1.3;
  }

  /** A short instruction above the bars; `{attack}`-style placeholders become the right key or button. */
  public hint(text: string, seconds = 5): void {
    this.hintEl.innerHTML = withGlyphs(text, this.device);
    this.hintEl.classList.add('show');
    this.hintTimer = seconds;
  }

  public clearHint(): void {
    this.hintTimer = 0;
    this.hintEl.classList.remove('show');
  }

  /**
   * The screen's edge flashes red. A hard blow (`damage` from a boss's swing up) with blood on (`bloody`) also pulses
   * a dark blood-red ink in from the edges, deeper the harder it was, and fading over a second (docs/APPROVALS.md,
   * "Blood": B's hurt vignette).
   */
  public hurt(damage = 0, bloody = false): void {
    this.hurtEl.classList.add('hit');
    requestAnimationFrame(() => requestAnimationFrame(() => this.hurtEl.classList.remove('hit')));
    if (!bloody || damage < HARD_BLOW) return;
    const k = THREE.MathUtils.clamp((damage - HARD_BLOW) / 9, 0, 1);
    this.pulse?.cancel();
    this.pulse = this.bloodEl.animate?.([
      { opacity: 0, transform: 'scale(1.06)' },
      { opacity: 0.7 + 0.3 * k, transform: 'scale(1)', offset: 0.07 },
      { opacity: 0.55 + 0.3 * k, transform: 'scale(1)', offset: 0.3 },
      { opacity: 0, transform: 'scale(1.02)' },
    ], { duration: 900 + 500 * k, easing: 'ease-out' }) ?? null;
  }
}
