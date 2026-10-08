import * as THREE from 'three';
import type { Player } from '../entities/Player';

/**
 * Both duel heroes share a model. Project a plain-text label above the animated head to keep their identities
 * readable: gold is local, vermilion is the peer. Peer names are never HTML. The fallback is only for a missing
 * head bone; rigs are preloaded before the fight. No campaign entity or HUD plate uses these overlays.
 */
export class DuelNameTags {
  private readonly container = document.getElementById('duel-tags')!;
  private readonly labels = [document.createElement('span'), document.createElement('span')];
  private readonly position = new THREE.Vector3();

  constructor(private readonly heroes: readonly Player[]) {
    this.container.replaceChildren(...this.labels);
    this.labels.forEach((label, i) => { label.className = 'duel-name ' + (i === 0 ? 'local' : 'remote'); });
    this.container.hidden = false;
  }

  public names(local: string, opponent: string): void {
    this.labels[0].textContent = local;
    this.labels[1].textContent = opponent;
  }

  public update(camera: THREE.Camera): void {
    this.heroes.forEach((hero, i) => {
      const head = hero.rig?.root.getObjectByName('mixamorigHead');
      if (head) head.getWorldPosition(this.position);
      else this.position.copy(hero.group.position).add(new THREE.Vector3(0, 1.7, 0));
      this.position.y += 0.3;
      this.position.project(camera);
      const label = this.labels[i];
      label.hidden = !hero.group.visible || this.position.z < -1 || this.position.z > 1;
      label.style.left = (this.position.x * 0.5 + 0.5) * window.innerWidth + 'px';
      label.style.top = (-this.position.y * 0.5 + 0.5) * window.innerHeight + 'px';
    });
  }

  public dispose(): void { this.container.replaceChildren(); this.container.hidden = true; }
}

/** Storage may be blocked; the lobby and practice still have a usable name. */
export function readDuelName(): string {
  try { return localStorage.getItem('yudhveer.duel.name')?.trim().slice(0, 16) || 'Yodha'; }
  catch { return 'Yodha'; }
}
