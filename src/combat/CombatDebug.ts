import * as THREE from 'three';
import type { Character } from '../entities/Character';
import type { CombatEvent } from './CombatSystem';

const LIVE = new THREE.Color(0xff3030);
const IDLE = new THREE.Color(0x40c0ff);
const MARKER_LIFE = 1.2;

/**
 * Combat debug overlay (toggle with F3): blades, hurt capsules, strike windows and contacts in the scene, and a
 * text panel with every fighter's state, state time, strike windows and the latest combat log. Draw-only: it
 * never changes the simulation.
 */
export class CombatDebug {
  public enabled = false;
  private readonly root = new THREE.Group();
  private readonly blades: THREE.LineSegments;
  private readonly capsules = new Map<string, THREE.LineSegments>();
  private readonly markers: { mesh: THREE.Mesh; age: number }[] = [];
  private readonly panel: HTMLDivElement;
  private readonly recent: CombatEvent[] = [];

  constructor(private readonly scene: THREE.Scene) {
    this.root.name = 'CombatDebug';
    this.root.visible = false;
    this.root.renderOrder = 999;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 16), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(6 * 16), 3));
    this.blades = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false }));
    this.blades.frustumCulled = false;
    this.root.add(this.blades);
    scene.add(this.root);

    this.panel = document.createElement('div');
    this.panel.style.cssText = 'position:fixed;right:8px;top:8px;z-index:60;pointer-events:none;display:none;' +
      'font:11px/1.35 ui-monospace,monospace;color:#e6f0ff;background:rgba(0,0,0,.62);padding:8px 10px;' +
      'border:1px solid rgba(120,180,255,.35);white-space:pre;max-width:46vw';
    document.body.appendChild(this.panel);
  }

  public toggle(on = !this.enabled): void {
    this.enabled = on;
    this.root.visible = on;
    this.panel.style.display = on ? 'block' : 'none';
  }

  /** A blow resolved: mark where it touched and keep it in the panel's log. */
  public onEvent(e: CombatEvent): void {
    this.recent.push(e);
    if (this.recent.length > 8) this.recent.shift();
    if (!this.enabled) return;
    const color = e.result === 'deflected' ? 0xffe066 : e.result === 'blocked' ? 0x66aaff : e.result === 'armored' ? 0xaaaaaa : 0xff4040;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6),
      new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true }));
    mesh.position.fromArray(e.point);
    this.root.add(mesh);
    this.markers.push({ mesh, age: 0 });
  }

  public update(fighters: Character[], dt: number): void {
    if (!this.enabled) return;
    const pos = this.blades.geometry.getAttribute('position') as THREE.BufferAttribute;
    const col = this.blades.geometry.getAttribute('color') as THREE.BufferAttribute;
    const lines: string[] = [];
    let n = 0;
    for (const f of fighters) {
      const sm = f.stateMachine;
      const windows = f.hitWindows(sm.currentState);
      const live = windows.some((w) => sm.stateTime >= w.t0 && sm.stateTime <= w.t1);
      if (n < 16) {
        const { hilt, tip } = f.getWeaponPoints();
        const c = live ? LIVE : IDLE;
        pos.setXYZ(n * 2, hilt.x, hilt.y, hilt.z);
        pos.setXYZ(n * 2 + 1, tip.x, tip.y, tip.z);
        col.setXYZ(n * 2, c.r, c.g, c.b);
        col.setXYZ(n * 2 + 1, c.r, c.g, c.b);
        n++;
      }
      this.drawCapsule(f, live);
      const win = windows.map((w) => `${w.t0.toFixed(2)}-${w.t1.toFixed(2)}`).join(' ');
      lines.push(`${f.id.padEnd(16)} ${sm.currentState.padEnd(12)} t=${sm.stateTime.toFixed(2).padStart(5)}` +
        (win ? `  hits[${win}]${live ? ' LIVE' : ''}  track<${f.trackUntil().toFixed(2)}` : ''));
    }
    for (let i = n; i < 16; i++) {
      pos.setXYZ(i * 2, 0, 0, 0);
      pos.setXYZ(i * 2 + 1, 0, 0, 0);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    for (let i = this.markers.length - 1; i >= 0; i--) {
      const m = this.markers[i];
      m.age += dt;
      (m.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - m.age / MARKER_LIFE;
      if (m.age >= MARKER_LIFE) {
        this.root.remove(m.mesh);
        m.mesh.geometry.dispose();
        (m.mesh.material as THREE.Material).dispose();
        this.markers.splice(i, 1);
      }
    }

    const log = this.recent.map((e) => `${e.t.toFixed(2).padStart(7)} ${e.attacker} ${e.attack}@${e.at.toFixed(2)} -> ${e.defender}: ${e.result}`);
    this.panel.textContent = ['COMBAT DEBUG (F3)', ...lines, '', 'recent:', ...log].join('\n');
  }

  /** A wireframe of the fighter's hurt capsule (rebuilt only when its size changes). */
  private drawCapsule(f: Character, live: boolean): void {
    const cap = f.hurtCapsule();
    const length = cap.b.distanceTo(cap.a);
    let mesh = this.capsules.get(f.id);
    const key = `${cap.radius.toFixed(3)}:${length.toFixed(3)}`;
    if (!mesh || mesh.userData.key !== key) {
      if (mesh) {
        this.root.remove(mesh);
        mesh.geometry.dispose();
      }
      mesh = new THREE.LineSegments(
        new THREE.WireframeGeometry(new THREE.CapsuleGeometry(cap.radius, length, 3, 10)),
        new THREE.LineBasicMaterial({ color: 0x40ff90, depthTest: false, transparent: true, opacity: 0.55 }),
      );
      mesh.userData.key = key;
      this.capsules.set(f.id, mesh);
      this.root.add(mesh);
    }
    mesh.position.copy(cap.a).add(cap.b).multiplyScalar(0.5);
    (mesh.material as THREE.LineBasicMaterial).color.set(live ? 0xffb030 : 0x40ff90);
  }

  /** Drops capsules of fighters that are gone (level switch). */
  public prune(fighters: Character[]): void {
    const ids = new Set(fighters.map((f) => f.id));
    for (const [id, mesh] of this.capsules) {
      if (ids.has(id)) continue;
      this.root.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.capsules.delete(id);
    }
  }
}
