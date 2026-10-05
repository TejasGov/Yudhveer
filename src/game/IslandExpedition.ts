import * as THREE from 'three';
import type { Expedition, ExpeditionSpawn } from './Expedition';
import { MiniMonster, ArcherMonster } from '../entities/IslandMonsters';
import { MINI_MONSTER, ARCHER_MONSTER } from '../entities/characters/IslandMonsters';
import { ISLAND } from '../levels/Level5_Island';

/*
 * Chapter III's expedition (docs/STORY.md, "Milestone 7"): three places on the way down to the mace where the dark
 * comes out at him, and the altar at the end. The creatures are placeholders (entities/IslandMonsters.ts).
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The placeholder creatures' bodies: the runts stand about 1.1 m, the archers 1.8 m. */
const RUNT_CAPSULE = { halfHeight: 0.28, radius: 0.3 };
const ARCHER_CAPSULE = { halfHeight: 0.5, radius: 0.38 };

const runt = (id: string, at: THREE.Vector3, face?: THREE.Vector3): ExpeditionSpawn =>
  ({ id, make: (i) => new MiniMonster(i), at, face, capsule: RUNT_CAPSULE, rig: MINI_MONSTER });
const archer = (id: string, at: THREE.Vector3, face?: THREE.Vector3): ExpeditionSpawn =>
  ({ id, make: (i) => new ArcherMonster(i), at, face, capsule: ARCHER_CAPSULE, rig: ARCHER_MONSTER });

/** Every creature of each encounter, by id (story beats wait on them). */
export const ISLAND_FOES = {
  hall: ['hall_runt_1', 'hall_runt_2', 'hall_runt_3', 'hall_runt_4', 'hall_runt_5'],
  pool: ['pool_archer_1', 'pool_archer_2', 'pool_runt_1', 'pool_runt_2', 'pool_runt_3'],
  shrine: ['shrine_archer_1', 'shrine_archer_2', 'shrine_runt_1', 'shrine_runt_2', 'shrine_runt_3', 'shrine_runt_4'],
  shrineBehind: ['shrine_runt_5', 'shrine_runt_6'],
};

export const ISLAND_EXPEDITION: Expedition = {
  encounters: [
    // The hall of bones: a pack of runts out of the dark at the hall's edges as he comes in among the bones.
    {
      id: 'hall',
      start: { at: ISLAND.hall, radius: 6.2 },
      callout: { text: 'Out of the dark', sub: 'Cave runts' },
      spawns: [
        runt('hall_runt_1', v(-5.6, -0.45, -22.2)),
        runt('hall_runt_2', v(-3.5, -0.45, -29.8)),
        runt('hall_runt_3', v(2.0, -0.45, -30.6)),
        runt('hall_runt_4', v(5.8, -0.45, -28.2)),
        runt('hall_runt_5', v(6.0, -0.45, -23.2)),
      ],
      checkpoint: { at: v(0, -0.45, -26.5), face: v(5, -0.5, -30) },
    },
    // The black pool: archers across the water and by the way on, runts from the dry side.
    {
      id: 'pool',
      start: { at: v(10.5, -2, -45), radius: 6.5 },
      callout: { text: 'Archers across the water', sub: 'Slide under their shafts, or turn them on the dhal' },
      spawns: [
        archer('pool_archer_1', v(5.0, -1.95, -41.8)),
        archer('pool_archer_2', v(7.5, -1.95, -53.0)),
        runt('pool_runt_1', v(14.6, -1.95, -50.2)),
        runt('pool_runt_2', v(13.6, -1.95, -52.4)),
        runt('pool_runt_3', v(15.2, -1.95, -44.0)),
      ],
      checkpoint: { at: v(10.5, -1.95, -48.5), face: v(8, -2, -54) },
    },
    // The shrine: its keepers in front of the altar, archers either side of the dais.
    {
      id: 'shrine',
      start: { at: v(0.5, -2.5, -66), radius: 3.2 },
      callout: { text: 'The shrine has keepers' },
      spawns: [
        archer('shrine_archer_1', v(-5.0, -2.45, -75.2)),
        archer('shrine_archer_2', v(5.0, -2.45, -75.2)),
        runt('shrine_runt_1', v(-5.4, -2.45, -68.4)),
        runt('shrine_runt_2', v(5.2, -2.45, -67.8)),
        runt('shrine_runt_3', v(-2.4, -2.45, -72.2)),
        runt('shrine_runt_4', v(2.8, -2.45, -71.6)),
      ],
    },
    // And two more come down the tunnel behind him once the shrine's keepers are nearly done.
    {
      id: 'shrine-behind',
      start: { after: 'shrine', alive: 2 },
      callout: { text: 'Behind you' },
      spawns: [
        runt('shrine_runt_5', v(1.2, -2.45, -61.0)),
        runt('shrine_runt_6', v(3.4, -2.15, -58.6)),
      ],
    },
  ],
  goal: { at: ISLAND.beforeAltar, radius: 2.3, hint: 'Not while its keepers stand.' },
};
